// Demo vocabulary - 15 words
export const VOCABULARY = [
  "HELLO",
  "THANKS",
  "HELP",
  "PLEASE",
  "WATER",
  "FOOD",
  "MEDICINE",
  "DOCTOR",
  "NURSE",
  "PAIN",
  "SICK",
  "YES",
  "NO",
  "SORRY",
  "GOOD"
];

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
    }
  }

  return matrix[a.length][b.length];
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
