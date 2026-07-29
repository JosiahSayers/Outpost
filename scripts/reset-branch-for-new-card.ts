import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    card: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: false,
});

const currentBranch = (await Bun.$`git branch --show-current`.text()).trim();
if (!currentBranch) {
  console.error("Couldn't determine the current branch");
  process.exit(1);
}

const alreadyOnMain = currentBranch === "main";
if (alreadyOnMain) {
  console.log("already on main, skipping deletion of old branch");
} else {
  await Bun.$`git branch -D main`;
  await Bun.$`git checkout main`;
  await Bun.$`git branch -D ${currentBranch}`;
}

await Bun.$`git pull`;

if (values.card) {
  await Bun.$`git checkout -b ${values.card}`;
}
