const fs = require( "fs")
const execa = require('execa');

async function main () {
  try {
    await execa(
      "npx", [ "tsc", "--strictNullChecks" ]
    )
  } catch ({ stdout }: any) {
    // if this fails then we still have null check errors to fix!
    //
    //
    const lines: string[] = (stdout as string).split("\n");

    // a line looks like "src/cli/task-info.ts(10,71): error TS2532: Object is
    // possibly 'undefined'.",
    //
    // there are some lines which begin with whitespace which don't have a
    // filepath in them, so we can filter those out and then split on the first
    // '(' to just get the file in which the error is occurring
    const affectedFiles = lines.filter(line => !line.startsWith(" ")).map(line => line.split("(")[0])


    const occurenceCountMap = new Map<string, number>()

    affectedFiles.forEach(filepath => {
      occurenceCountMap.set(filepath, (occurenceCountMap.get(filepath) ?? 0) + 1)
    });

    let sorted = [...occurenceCountMap.entries()].sort((a, b) => a[1] - b[1]).reverse()

    console.log("the ten files with the most errors are:")
    console.log(sorted.slice(0, 10));
  }
}

main()

