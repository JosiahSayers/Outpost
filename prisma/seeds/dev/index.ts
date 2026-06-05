import { createUsers } from "./user";

await createUsers();
process.exit(0); // script hangs for a few seconds without this
