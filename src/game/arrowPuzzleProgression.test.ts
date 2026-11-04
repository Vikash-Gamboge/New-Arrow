import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from './generator';
import { isLevelSolvable, getFreeArrows, getDifficultyForLevel } from './logic';

test('Repeating 20-Level Difficulty Structure for Levels 1–60 (and beyond)', () => {
  for (let lvl = 1; lvl <= 60; lvl++) {
    const level = generateLevel(lvl);
    const mod = ((lvl - 1) % 20) + 1;

    let expectedDifficulty: string;
    if (mod <= 5) {
      expectedDifficulty = 'Easy';
    } else if (mod <= 10) {
      expectedDifficulty = 'Normal';
    } else if (mod <= 15) {
      expectedDifficulty = 'Hard';
    } else {
      expectedDifficulty = 'Very Hard';
    }

    assert.equal(
      level.difficulty,
      expectedDifficulty,
      `Level ${lvl} (mod ${mod}) expected difficulty ${expectedDifficulty}, got ${level.difficulty}`
    );

    assert.equal(
      getDifficultyForLevel(lvl),
      expectedDifficulty,
      `getDifficultyForLevel(${lvl}) expected ${expectedDifficulty}`
    );
  }
});

test('Every 20-level group contains ALL FOUR difficulty categories (Easy, Normal, Hard, Very Hard)', () => {
  for (let group = 0; group < 3; group++) {
    const startLvl = group * 20 + 1;
    const endLvl = (group + 1) * 20;

    const difficultiesSeen = new Set<string>();
    for (let lvl = startLvl; lvl <= endLvl; lvl++) {
      const level = generateLevel(lvl);
      difficultiesSeen.add(level.difficulty);
    }

    assert.equal(
      difficultiesSeen.size,
      4,
      `Group Levels ${startLvl}–${endLvl} must contain all 4 difficulty categories, but found: ${Array.from(difficultiesSeen).join(', ')}`
    );
    assert.ok(difficultiesSeen.has('Easy'));
    assert.ok(difficultiesSeen.has('Normal'));
    assert.ok(difficultiesSeen.has('Hard'));
    assert.ok(difficultiesSeen.has('Very Hard'));
  }
});

test('Progressive Complexity Monotonically Increases Across Repeating Difficulty Cycles', () => {
  // Compare Easy levels across repeating 20-level cycles:
  const l1Easy = generateLevel(1);
  const l21Easy = generateLevel(21);
  const l41Easy = generateLevel(41);
  const l61Easy = generateLevel(61);

  assert.ok(
    l21Easy.arrows.length > l1Easy.arrows.length,
    `Level 21 Easy (${l21Easy.arrows.length} arrows) must be more complex than Level 1 Easy (${l1Easy.arrows.length} arrows)`
  );
  assert.ok(
    l41Easy.arrows.length > l21Easy.arrows.length,
    `Level 41 Easy (${l41Easy.arrows.length} arrows) must be more complex than Level 21 Easy (${l21Easy.arrows.length} arrows)`
  );
  assert.ok(
    l61Easy.arrows.length > l41Easy.arrows.length,
    `Level 61 Easy (${l61Easy.arrows.length} arrows) must be more complex than Level 41 Easy (${l41Easy.arrows.length} arrows)`
  );

  // Compare Very Hard levels across repeating cycles:
  const l20VeryHard = generateLevel(20);
  const l40VeryHard = generateLevel(40);
  const l60VeryHard = generateLevel(60);

  assert.ok(
    l40VeryHard.arrows.length > l20VeryHard.arrows.length,
    `Level 40 Very Hard (${l40VeryHard.arrows.length} arrows) must be more complex than Level 20 Very Hard (${l20VeryHard.arrows.length} arrows)`
  );
  assert.ok(
    l60VeryHard.arrows.length > l40VeryHard.arrows.length,
    `Level 60 Very Hard (${l60VeryHard.arrows.length} arrows) must be more complex than Level 40 Very Hard (${l40VeryHard.arrows.length} arrows)`
  );

  // Difficulty scores must strictly increase:
  assert.ok(l21Easy.difficultyScore > l1Easy.difficultyScore, 'Difficulty score must increase L1 -> L21');
  assert.ok(l41Easy.difficultyScore > l21Easy.difficultyScore, 'Difficulty score must increase L21 -> L41');
  assert.ok(l40VeryHard.difficultyScore > l20VeryHard.difficultyScore, 'Difficulty score must increase L20 -> L40');
  assert.ok(l60VeryHard.difficultyScore > l40VeryHard.difficultyScore, 'Difficulty score must increase L40 -> L60');
});

test('Gradually increases arrow path length, directional turns, and 3/4/5-turn arrows', () => {
  const earlyLevel = generateLevel(2);
  const midLevel = generateLevel(28);
  const highLevel = generateLevel(58);

  const getMultiTurnArrows = (level: ReturnType<typeof generateLevel>) => {
    // points.length - 2 = number of 90-degree turns
    return level.arrows.filter((a) => a.points.length - 2 >= 3);
  };

  const earlyMultiTurn = getMultiTurnArrows(earlyLevel);
  const highMultiTurn = getMultiTurnArrows(highLevel);

  assert.ok(
    highLevel.arrows.length > midLevel.arrows.length,
    `Arrow count must increase from Level 28 (${midLevel.arrows.length}) to Level 58 (${highLevel.arrows.length})`
  );

  assert.ok(
    highMultiTurn.length >= earlyMultiTurn.length,
    `High levels must feature more 3, 4, and 5-turn arrows`
  );
});

test('Levels 1–60 are 100% solvable with valid opening moves and 3:4 portrait ratio', () => {
  for (let lvl = 1; lvl <= 60; lvl++) {
    const level = generateLevel(lvl);

    assert.equal(
      isLevelSolvable(level.arrows),
      true,
      `Level ${lvl} must be 100% solvable`
    );

    const freeAtStart = getFreeArrows(level.arrows);
    assert.ok(
      freeAtStart.length >= 1,
      `Level ${lvl} must have at least 1 free opening arrow`
    );

    const ratio = level.gridWidth / level.gridHeight;
    assert.equal(
      ratio,
      0.75,
      `Level ${lvl} must strictly adhere to portrait 3:4 aspect ratio (0.75), got ${ratio}`
    );
  }
});

