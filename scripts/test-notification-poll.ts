import { db } from "$/utils/db";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    email: {
      type: "string",
      default: "admin@test.com",
    },
    title: {
      type: "string",
      default: "This is a test",
    },
    description: {
      type: "string",
      default: "Here is some notification content",
    },
    referenceUrl: {
      type: "string",
    },
  },
});

const user = await db.user.findUniqueOrThrow({
  where: { email: values.email },
});

const createNotification = async () => {
  let referenceUrl = values.referenceUrl;

  if (!referenceUrl) {
    const trip = await db.trip.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (trip) {
      referenceUrl = `/trips/${trip.id}`;
    }
  }

  await db.notification.create({
    data: {
      userId: user.id,
      title: values.title,
      description: values.description,
      referenceUrl,
    },
  });
};

await createNotification();
setInterval(createNotification, 59_000);
