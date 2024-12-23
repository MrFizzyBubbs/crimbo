import {
  equippedItem,
  haveSkill,
  Item,
  itemType,
  myBuffedstat,
  myClass,
  myFamiliar,
  myPrimestat,
  Skill,
  toMonster,
  visitUrl,
} from "kolmafia";
import {
  $class,
  $familiar,
  $item,
  $items,
  $monster,
  $phylum,
  $skill,
  $slot,
  $stat,
  Counter,
  get,
  have,
  maxBy,
  SongBoom,
  StrictMacro,
} from "libram";

import { canOpenRedPresent, timeToMeatify } from "./familiar";
import { getSniffTarget, shouldRedigitize } from "./lib";

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
      // eslint-disable-next-line libram/verify-constants
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
      Macro.trySkillRepeat($skill`Saucegeyser`)
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

  trySniff(): this {
    const monster = getSniffTarget();
    if (monster === null) return this;
    if (monster.phylum === $phylum`elf`) {
      const prankCardMonster = toMonster(get("_prankCardMonster"));
      if (prankCardMonster === monster && Counter.get("Prank Card Monster") !== Infinity)
        return this;
      // eslint-disable-next-line libram/verify-constants
      return this.if_(monster, Macro.tryHaveItem($item`prank Crimbo card`));
    } else if (monster.phylum === $phylum`pirate`) {
      const trickCoinMonster = toMonster(get("_trickCoinMonster"));
      if (trickCoinMonster === monster && Counter.get("Trick Coin Monster") !== Infinity)
        return this;
      // eslint-disable-next-line libram/verify-constants
      return this.if_(monster, Macro.tryHaveItem($item`trick coin`));
    }
    return this;
  }

  static trySniff(): Macro {
    return new Macro().trySniff();
  }

  standardCombat(): this {
    return this.if_(
      "!monstername Crimbuccaneer mudlark && !monstername Elf Guard engineer",
      "pickpocket"
    )
      .tryHaveSkill($skill`Curse of Weaksauce`)
      .trySniff()
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
      .trySkill($skill`Bowl Sideways`)
      .gooKill()
      .hardKill()
      .attack()
      .repeat();
  }

  static hardCombat(): Macro {
    return new Macro().hardCombat();
  }
}
