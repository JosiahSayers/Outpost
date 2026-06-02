import { faker } from "@faker-js/faker";
import { auth } from "$/utils/auth";

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
  ]);
}
