import { Args, ParseError } from "grimoire-kolmafia";
import {
  canEquip,
  descToItem,
  inebrietyLimit,
  isDarkMode,
  Item,
  myAdventures,
  myFamiliar,
  myInebriety,
  myPrimestat,
  myTurncount,
  print,
  runChoice,
  visitUrl,
} from "kolmafia";
import { $familiar, $item, $stat, Counter, CrystalBall, get, have, SourceTerminal } from "libram";

import ISLANDS, { HolidayIsland } from "./islands";

export type Island = keyof typeof ISLANDS;

export function shouldRedigitize(): boolean {
  const digitizesLeft = SourceTerminal.getDigitizeUsesRemaining();
  const monsterCount = SourceTerminal.getDigitizeMonsterCount() + 1;
  // triangular number * 10 - 3
  const digitizeAdventuresUsed = monsterCount * (monsterCount + 1) * 5 - 3;
  // Redigitize if fewer adventures than this digitize usage.
  return (
    SourceTerminal.have() &&
    SourceTerminal.canDigitize() &&
    myAdventures() / 0.96 < digitizesLeft * digitizeAdventuresUsed
  );
}

const HIGHLIGHT = isDarkMode() ? "yellow" : "blue";
export function printh(message: string) {
  print(message, HIGHLIGHT);
}

export function printd(message: string) {
  if (args.debug) {
    print(message, HIGHLIGHT);
  }
}

export function sober() {
  return myInebriety() <= inebrietyLimit() + (myFamiliar() === $familiar`Stooper` ? -1 : 0);
}

export const args = Args.create("crimbo24", "A script for farming elf stuff", {
  ascend: Args.flag({
    help: "Whether you plan to ascend right after this",
    default: false,
  }),
  turns: Args.number({
    help: "The number of turns to run (use negative numbers for the number of turns remaining)",
    default: Infinity,
  }),
  island: Args.custom<Island[]>(
    {
      hidden: false,
      help: `Which island to adventure at. Valid options include ${Object.keys(ISLANDS).map(
        (island) => island.toLowerCase()
      )}. Use two, separated by only a comma, if you want to use the orb. E.g., "easter,stpatrick".`,
      default: [] as Island[],
    },
    (str): Island[] | ParseError => {
      const splitStr = str.split(",").filter(Boolean);
      if (![1, 2].includes(splitStr.length))
        return new ParseError("Please select at least 1 island, and at most 2");
      if (!CrystalBall.have() && splitStr.length === 2)
        return new ParseError(
          "Without miniature crystal ball, you may only select a single island."
        );
      const mappedStr = splitStr.map(
        (islandName) =>
          Object.keys(ISLANDS).find(
            (island) => island.toLowerCase() === islandName.toLowerCase()
          ) ?? new ParseError(`Cannot find island for string ${islandName}`)
      );
      const error = mappedStr.find((el): el is ParseError => el instanceof ParseError);
      if (error) return error;
      return mappedStr as Island[];
    },
    ""
  ),
  shrub: Args.boolean({
    help: "Whether to use the Crimbo Shrub when farming Crimbo zones.",
    default: false,
  }),
  turdsKey: Args.boolean({
    help: "Should this script try to use T.U.R.D.S key when encountering `spectre of war` for 20 turns of Everything Looks <Cooldown Color> instead of the normal 30",
    default: false,
  }),
  waffles: Args.boolean({
    help: "Should this script try to waffle away every single monster as long as it has waffles, except the rare dropping ones? Caution, this will rapidly drain your inventory of waffles!",
    default: false,
  }),
  freeruns: Args.boolean({
    help: "Should the script try to freerun with GAP / Navel Gazing Ring if the monster isn't one of the rare droppers? This means you will forfeit the drops of other monsters.",
    default: false,
  }),
  debug: Args.flag({
    help: "Turn on debug printing",
    default: false,
  }),
});

export function getIslands(): HolidayIsland[] {
  if (!args.island?.length)
    throw new Error(
      "Listen, buddy, you've got to pick an Island. It's not clear how we got this far."
    );

  const islands = args.island
    .map(
      (island) =>
        Object.entries(ISLANDS).find(([key]) => key.toLowerCase() === island.toLowerCase())?.[1]
    )
    .filter((x): x is HolidayIsland => !!x);
  return islands;
}

export function getIsland(orb = true): HolidayIsland {
  const islands = getIslands();

  if (!orb || islands.length === 1) return islands[0];

  const ponderResult = CrystalBall.getPrediction();

  return (
    islands.find(({ location, orbTarget }) => ponderResult.get(location) === orbTarget) ??
    islands.find(({ location }) => !ponderResult.has(location)) ??
    islands[0]
  );
}

function getCMCChoices(): { [choice: string]: number } {
  const options = visitUrl("campground.php?action=workshed");
  let i = 0;
  let match;
  const entries: [string, number][] = [];

  const regexp = /descitem\((\d+)\)/g;
  while ((match = regexp.exec(options)) !== null) {
    entries.push([`${descToItem(match[1])}`, ++i]);
  }
  return Object.fromEntries(entries);
}

export function tryGetCMCItem(item: Item): void {
  const choice = getCMCChoices()[`${item}`];
  if (choice) {
    runChoice(choice);
  }
}

export type CMCEnvironment = "u" | "i";
export function countEnvironment(environment: CMCEnvironment): number {
  return get("lastCombatEnvironments")
    .split("")
    .filter((e) => e === environment).length;
}

export type RealmType = "spooky" | "stench" | "hot" | "cold" | "sleaze" | "fantasy" | "pirate";
export function realmAvailable(identifier: RealmType): boolean {
  if (identifier === "fantasy") {
    return get(`_frToday`) || get(`frAlways`);
  } else if (identifier === "pirate") {
    return get(`_prToday`) || get(`prAlways`);
  }
  return get(`_${identifier}AirportToday`, false) || get(`${identifier}AirportAlways`, false);
}

function untangleDigitizes(turnCount: number, chunks: number): number {
  const turnsPerChunk = turnCount / chunks;
  const monstersPerChunk = Math.sqrt((turnsPerChunk + 3) / 5 + 1 / 4) - 1 / 2;
  return Math.round(chunks * monstersPerChunk);
}

/**
 *
 * @returns The number of digitized monsters that we expect to fight today
 */
export function digitizedMonstersRemaining(turns = myTurncount()): number {
  if (!SourceTerminal.have()) return 0;

  const digitizesLeft = SourceTerminal.getDigitizeUsesRemaining();
  if (digitizesLeft === SourceTerminal.getMaximumDigitizeUses()) {
    return untangleDigitizes(turns, SourceTerminal.getMaximumDigitizeUses());
  }

  const monsterCount = SourceTerminal.getDigitizeMonsterCount() + 1;

  const turnsLeftAtNextMonster = turns - Counter.get("Digitize Monster");
  if (turnsLeftAtNextMonster <= 0) return 0;
  const turnsAtLastDigitize = turnsLeftAtNextMonster + ((monsterCount + 1) * monsterCount * 5 - 3);
  return (
    untangleDigitizes(turnsAtLastDigitize, digitizesLeft + 1) -
    SourceTerminal.getDigitizeMonsterCount()
  );
}

export const canPickpocket = () =>
  myPrimestat() === $stat`moxie` ||
  [have, canEquip].some((func) => func($item`mime army infiltration glove`));
export const shouldPickpocket = () =>
  myInebriety() <= inebrietyLimit() && canPickpocket() && have($item`deft pirate hook`); // && unlikely to be the guy you can't pickpocket, I guess?
