/* Perception layer: truth → DecisionContext. Attach onto the UMD engine.
 * projectPerception is pure. Observations update once per turn, before any decision.
 * DecisionContext has no RNG seed and no bandValues.
 */
'use strict';

const DEFAULT_RULES = {
  bands: { weakMax: 25000, mediumMax: 45000, strongMax: 90000 },
  aliases: {},
  knownByDefault: ['cao_cao', 'liu_bei', 'sun_quan'],
  prior: {
    id: 'wu_jing_pressure',
    holders: ['li_shimin', 'zhu_yuanzhang'],
    when: { alive: ['guan_yu'], owner: { jing_nan: 'liu_bei', jiang: 'sun_quan', jing: 'cao_cao' } },
    bias: { attack: 1.35 },
    focus: ['jing_nan', 'jing'],
  },
};
const BAND_VALUES = { unknown: 32000, weak: 18000, medium: 35000, strong: 65000, very_strong: 130000 };
