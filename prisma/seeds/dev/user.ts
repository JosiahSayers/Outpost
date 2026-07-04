import { auth } from "$/utils/auth";
import { db } from "$/utils/db";
import { faker } from "@faker-js/faker";

export async function createUsers() {
  await Promise.all([
    auth.api.signUpEmail({
      body: {
        name: faker.person.fullName(),
        email: "user@test.com",
        password: "user-password",
      },
    }),
    auth.api.signUpEmail({
      body: {
        name: faker.person.fullName(),
        email: "user2@test.com",
        password: "user2-password",
      },
    }),
    auth.api.signUpEmail({
      body: {
        name: faker.person.fullName(),
        email: "admin@test.com",
        password: "admin-password",
      },
    }),
  ]);

  await db.user.update({
    where: { email: "admin@test.com" },
    data: { role: "admin" },
  });
}
