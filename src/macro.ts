import {
  equippedItem,
  haveEquipped,
  haveSkill,
  Item,
  itemType,
  myBuffedstat,
  myClass,
  myFamiliar,
  myPrimestat,
  Skill,
  visitUrl,
} from "kolmafia";
import {
  $class,
  $effect,
  $familiar,
  $item,
  $items,
  $monster,
  $skill,
  $slot,
  $stat,
  get,
  have,
  maxBy,
  SongBoom,
  StrictMacro,
} from "libram";

import { canOpenRedPresent, timeToMeatify } from "./familiar";
import { HolidayIsland } from "./islands";
import { args, shouldRedigitize } from "./lib";

const gooKillSkills = [
  { skill: $skill`Nantlers`, stat: $stat`muscle` },
  { skill: $skill`Nanoshock`, stat: $stat`mysticality` },
  { skill: $skill`Audioclasm`, stat: $stat`moxie` },
];

let monsterManuelCached: boolean | undefined = undefined;
function monsterManuelAvailable(): boolean {
  if (monsterManuelCached !== undefined) return Boolean(monsterManuelCached);
  monsterManuelCached = visitUrl("questlog.php?which=3").includes("Monster Manuel");
  return Boolean(monsterManuelCached);
}

export default class Macro extends StrictMacro {
  tryHaveSkill(skill: Skill): this {
    return this.externalIf(have(skill), Macro.trySkill(skill));
  }

  static tryHaveSkill(skill: Skill): Macro {
    return new Macro().tryHaveSkill(skill);
  }

  tryHaveItem(item: Item): this {
    return this.externalIf(have(item), Macro.tryItem(item));
  }

  static tryHaveItem(item: Item): Macro {
    return new Macro().tryHaveItem(item);
  }

  redigitize(): this {
    return this.externalIf(
      shouldRedigitize(),
      Macro.if_(
        get("_sourceTerminalDigitizeMonster") ?? $monster.none,
        Macro.skill($skill`Digitize`)
      )
    );
  }

  static redigitize(): Macro {
    return new Macro().redigitize();
  }

  doItems(wanted: Item[]): this {
    const steps = new Macro();
    const items = wanted.filter((i) => have(i));
    if (items.length) {
      if (!have($skill`Ambidextrous Funkslinging`)) {
        for (const item of items) steps.tryItem(item);
      } else {
        for (let i = 0; i <= items.length; i += 2) {
          const chunk = items.slice(i, i + 2);
          if (chunk.length === 2) steps.tryItem(chunk as [Item, Item]);
          else steps.tryItem(...chunk);
        }
      }
    }
    return this.step(steps);
  }

  static doItems(wanted: Item[]): Macro {
    return new Macro().doItems(wanted);
  }

  doStandardItems(): this {
    return this.doItems(
      $items`Rain-Doh blue balls, Time-Spinner, Rain-Doh indigo cup, porquoise-handled sixgun`
    );
  }

  static doStandardItems(): Macro {
    return new Macro().doStandardItems();
  }

  doHardItems(): this {
    return this.doItems(
      $items`train whistle, Time-Spinner, little red book, Rain-Doh indigo cup, porquoise-handled sixgun`
    );
  }

  static doHardItems(): Macro {
    return new Macro().doHardItems();
  }

  familiarActions(): this {
    return this.externalIf(
      canOpenRedPresent() && myFamiliar() === $familiar`Crimbo Shrub`,
      Macro.trySkill($skill`Open a Big Red Present`)
    ).externalIf(
      timeToMeatify() && myFamiliar() === $familiar`Grey Goose`,
      Macro.trySkill($skill`Meatify Matter`)
    );
  }

  static familiarActions(): Macro {
    return new Macro().familiarActions();
  }

  hardKill(): this {
    if (myClass() === $class`Grey Goo`) return this;

    return this.externalIf(
      myPrimestat() === $stat`mysticality`,
      Macro.ifNot($monster`Section 11`, Macro.trySkillRepeat($skill`Saucegeyser`))
    )
      .externalIf(
        haveSkill($skill`Shieldbutt`) &&
          itemType(equippedItem($slot`offhand`)) === "shield" &&
          myClass() === $class`Turtle Tamer`,
        Macro.trySkillRepeat($skill`Shieldbutt`)
      )
      .trySkillRepeat($skill`Lunging Thrust-Smack`)
      .trySkillRepeat($skill`Kneebutt`);
  }

  static hardKill(): Macro {
    return new Macro().hardKill();
  }

  gooKill(): this {
    if (myClass() !== $class`Grey Goo`) return this;

    const gooKillSkill: Skill = maxBy(
      gooKillSkills.filter(({ skill }) => have(skill)),
      ({ stat }) => myBuffedstat(stat)
    ).skill;

    return this.externalIf(
      monsterManuelAvailable() && haveSkill($skill`Infinite Loop`),
      Macro.while_(`monsterhpabove ${myBuffedstat($stat`moxie`)}`, Macro.skill(gooKillSkill))
        .skill($skill`Infinite Loop`)
        .repeat(),
      Macro.skill(gooKillSkill).repeat()
    );
  }

  static gooKill(): Macro {
    return new Macro().gooKill();
  }

  standardCombat(): this {
    return this.tryHaveSkill($skill`Curse of Weaksauce`)
      .familiarActions()
      .externalIf(
        SongBoom.song() === "Total Eclipse of Your Meat",
        Macro.tryHaveSkill($skill`Sing Along`)
      )
      .tryHaveSkill($skill`Extract`)
      .externalIf(have($skill`Meteor Lore`), Macro.trySkill($skill`Micrometeorite`))
      .trySkill($skill`Pocket Crumbs`)
      .doStandardItems()
      .gooKill()
      .attack()
      .repeat();
  }

  static standardCombat(): Macro {
    return new Macro().standardCombat();
  }

  hardCombat(): this {
    return this.tryHaveSkill($skill`Curse of Weaksauce`)
      .familiarActions()
      .externalIf(have($skill`Meteor Lore`), Macro.skill($skill`Micrometeorite`))
      .tryHaveSkill($skill`Pocket Crumbs`)
      .doHardItems()
      .gooKill()
      .hardKill()
      .attack()
      .repeat();
  }

  static hardCombat(): Macro {
    return new Macro().hardCombat();
  }

  pickpocket(): this {
    return this.step("pickpocket");
  }

  static pickpocket(): Macro {
    return new Macro().pickpocket();
  }

  itemOrSkill(thing: Item | Skill): this {
    if (thing instanceof Item) return this.item(thing);
    else return this.skill(thing);
  }

  static itemOrSkill(thing: Item | Skill): Macro {
    return new Macro().itemOrSkill(thing);
  }

  tKey(): this {
    if (args.turdsKey && !have($effect`Everything Looks Green`)) {
      return this.if_($monster`spectre of war`, Macro.tryHaveItem($item`T.U.R.D.S. Key`));
    }

    return this;
  }

  waffleOrRun(island: HolidayIsland): this {
    return this.waffle(island).gapRunIfUnwantedMonster(island);
  }

  waffle(island: HolidayIsland): this {
    if (args.waffles)
      return this.while_(
        `hascombatitem waffle && (${Macro.makeBALLSPredicate(island.avoidMonsters)})`,
        Macro.tKey()
          .tearawayPants()
          .item($item`waffle`)
      );
    else return this;
  }

  islandKillWith(island: HolidayIsland, thing: Item | Skill): this {
    return this.pickpocket()
      .tKey()
      .trySkill($skill`Launch spikolodon spikes`)
      .tearawayPants()
      .waffle(island)
      .itemOrSkill(thing);
  }

  gapRunIfUnwantedMonster(island: HolidayIsland): this {
    // If wearing GAP / Navel ring, then run if its an undesired monster
    return this.externalIf(
      args.freeruns &&
        $items`Greatest American Pants, navel ring of navel gazing`.some((item) =>
          haveEquipped(item)
        ),
      Macro.if_(island.avoidMonsters, Macro.runaway())
    );
  }

  tearawayPants(): this {
    return this.externalIf(
      haveEquipped($item`tearaway pants`),
      Macro.if_("!pastround 1 && monsterphylum plant", Macro.skill($skill`Tear Away your Pants!`))
    );
  }

  static islandKillWith(island: HolidayIsland, thing: Item | Skill): Macro {
    return new Macro().islandKillWith(island, thing);
  }

  static tKey(): Macro {
    return new Macro().tKey();
  }

  islandRunWith(island: HolidayIsland, thing: Item | Skill): this {
    return this.pickpocket()
      .tearawayPants()
      .trySkill($skill`Launch spikolodon spikes`)
      .tKey()
      .if_(island.avoidMonsters, Macro.itemOrSkill(thing))
      .attack()
      .repeat("!pastround 3")
      .hardCombat();
  }

  static islandRunWith(island: HolidayIsland, thing: Item | Skill): Macro {
    return new Macro().islandRunWith(island, thing);
  }

  static islandCombat(island: HolidayIsland): Macro {
    return Macro.pickpocket()
      .trySkill($skill`Launch spikolodon spikes`)
      .tearawayPants()
      .tKey()
      .waffleOrRun(island)
      .if_($monster`pumpkin spice wraith`, new Macro().tryHaveItem($item`traumatic holiday memory`))
      .attack()
      .repeat("!pastround 3")
      .hardCombat();
  }
}
