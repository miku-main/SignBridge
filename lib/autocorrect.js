// Clinic vocabulary for autocorrect, grouped by topic.
// Words with J or Z can't be fully fingerspelled (the model has no J/Z), but
// they still help typed input and longer near-misses.
// Avoid adding words one letter away from common names (e.g. MEMORY vs EMORY).
const GROUPS = {
  basics: [
    "HELLO", "HI", "YES", "NO", "PLEASE", "THANKS", "SORRY", "OK", "WAIT",
    "HELP", "REPEAT", "SLOW", "WRITE", "UNDERSTAND", "INTERPRETER", "DEAF",
  ],
  checkIn: [
    "APPOINTMENT", "CHECK", "INSURANCE", "CARD", "NAME", "BIRTHDAY",
    "ADDRESS", "PHONE", "EMAIL", "FORM", "LATE", "EMERGENCY", "BATHROOM",
    "PHARMACY", "PRESCRIPTION", "REFILL", "BILL",
  ],
  symptoms: [
    "PAIN", "HURT", "SICK", "FEVER", "COUGH", "COLD", "FLU", "DIZZY",
    "NAUSEA", "VOMIT", "HEADACHE", "RASH", "BLEEDING", "BREATHE", "TIRED",
    "SWELLING", "INFECTION", "ALLERGY", "PREGNANT", "DIABETES",
  ],
  body: [
    "HEAD", "EAR", "EYE", "NOSE", "THROAT", "CHEST", "HEART", "STOMACH",
    "BACK", "ARM", "LEG", "FOOT", "HAND", "TOOTH", "SKIN", "BLOOD",
  ],
  care: [
    "DOCTOR", "NURSE", "MEDICINE", "PILL", "SHOT", "VACCINE", "TEST",
    "XRAY", "SURGERY", "WATER", "FOOD", "FAMILY",
  ],
  time: ["TODAY", "YESTERDAY", "TOMORROW", "NOW", "DAYS", "WEEK", "MORNING", "NIGHT"],
  describe: ["GOOD", "BAD", "BETTER", "WORSE", "MORE", "LESS"],
};

export const VOCABULARY = [...new Set(Object.values(GROUPS).flat())];

// Levenshtein distance
function editDistance(a, b) {
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,    // deletion
          matrix[i][j - 1] + 1,    // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        );
      }
      // Swapped neighbours (HEPL -> HELP) count as one edit
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[a.length][b.length];
}

// How many edits we tolerate before suggesting a word. Short words get less
// slack so names like EMORY or JACK aren't "corrected" into MORE or BACK.
function maxEdits(len) {
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

// The vocabulary word to suggest for what was spelled, or null to keep it as is.
export function suggestWord(input) {
  const match = findClosestWord(input);
  if (!match || match.distance === 0) return null;
  return match.distance <= maxEdits(input.length) ? match.word : null;
}

export function findClosestWord(input) {
  if (!input || input.length === 0) return null;

  // If exact match, return it
  if (VOCABULARY.includes(input)) {
    return { word: input, distance: 0, confidence: 1.0 };
  }

  // Find closest matches
  const matches = VOCABULARY.map(word => ({
    word,
    distance: editDistance(input.toUpperCase(), word)
  })).sort((a, b) => a.distance - b.distance);

  const best = matches[0];

  // Confidence based on distance and length
  const maxLen = Math.max(input.length, best.word.length);
  const confidence = 1 - (best.distance / maxLen);

  return {
    word: best.word,
    distance: best.distance,
    confidence: Math.max(0, confidence)
  };
}
