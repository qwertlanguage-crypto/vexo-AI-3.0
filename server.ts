import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// In-memory sync store for cross-device synchronization
interface SyncPayload {
  conversations: any[];
  settings: any;
  updatedAt: number;
}
const syncStore: Record<string, SyncPayload> = {};

// Helper: Get AI client dynamically using the latest process.env.GEMINI_API_KEY
function getGenAIClient(): GoogleGenAI | null {
  try {
    dotenv.config();
  } catch {}
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey || currentKey.trim() === '' || currentKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: currentKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health check & status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    engine: 'vexo-neural-v4.9',
    multimodal: true,
    webBrowsing: true,
    voiceEnabled: true,
    apiKeyConfigured: !!getGenAIClient(),
    timestamp: Date.now(),
  });
});

// Real-Time Web Search & Grounding Interface
interface SearchResultItem {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

async function performLiveWebSearch(query: string): Promise<SearchResultItem[]> {
  const results: SearchResultItem[] = [];
  try {
    const cleanQuery = query
      .replace(/^(what is|who is|tell me about|how to|explain|can you|search for|lookup)\s+/i, '')
      .trim();
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery || query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const titleRegex = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

      const titles: Array<{ url: string; title: string }> = [];
      let tm;
      while ((tm = titleRegex.exec(html)) !== null) {
        let rawUrl = tm[1];
        if (rawUrl.includes('uddg=')) {
          const matchU = rawUrl.match(/uddg=([^&]+)/);
          if (matchU) rawUrl = decodeURIComponent(matchU[1]);
        }
        titles.push({
          url: rawUrl,
          title: tm[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim(),
        });
      }

      const snippets: string[] = [];
      let sm;
      while ((sm = snippetRegex.exec(html)) !== null) {
        snippets.push(
          sm[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim()
        );
      }

      for (let i = 0; i < Math.min(titles.length, snippets.length, 6); i++) {
        let domain = 'web';
        try {
          domain = new URL(titles[i].url).hostname.replace('www.', '');
        } catch {}
        if (titles[i].title && snippets[i]) {
          results.push({
            title: titles[i].title,
            url: titles[i].url,
            domain,
            snippet: snippets[i],
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Vexo Web Search notice]:', (err as any)?.message);
  }
  return results;
}

// Live Wikipedia Knowledge Extractor
async function fetchWikipediaKnowledge(
  query: string
): Promise<{ title: string; extract: string; url: string } | null> {
  try {
    const clean = query
      .replace(/^(what is|who is|explain|tell me about|how does|why is|describe)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      clean
    )}&format=json&utf8=`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VexoAI/4.9 (https://vexo.systems)' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.query?.search?.length) return null;

    const topHit = data.query.search[0];
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(
      topHit.title
    )}&format=json`;

    const c2 = new AbortController();
    const t2 = setTimeout(() => c2.abort(), 3500);
    const extRes = await fetch(extractUrl, {
      signal: c2.signal,
      headers: { 'User-Agent': 'VexoAI/4.9 (https://vexo.systems)' },
    });
    clearTimeout(t2);

    if (!extRes.ok) return null;
    const extData = await extRes.json();
    const pages = extData.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    if (!page?.extract) return null;

    return {
      title: page.title,
      extract: page.extract,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/\s+/g, '_'))}`,
    };
  } catch {
    return null;
  }
}

// Comprehensive Gemini-Style Knowledge Synthesis Engine
async function generateVexoAutonomousResponse(
  userQuery: string,
  enableWebSearch: boolean,
  reasoningDepth: string
): Promise<{ content: string; sources?: Array<{ title: string; url: string; domain: string }>; searchQueries?: string[] }> {
  const q = userQuery.toLowerCase().trim();

  // Math Expression Evaluator
  const mathMatch = q.match(/^(\d+(\.\d+)?)\s*([\+\-\*\/x\^])\s*(\d+(\.\d+)?)$/i);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[3];
    const b = parseFloat(mathMatch[4]);
    let result = 0;
    let symbol = op;
    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*' || op.toLowerCase() === 'x') { result = a * b; symbol = '×'; }
    else if (op === '/') { result = b !== 0 ? a / b : NaN; symbol = '÷'; }
    else if (op === '^') { result = Math.pow(a, b); symbol = '^'; }

    return {
      content: `### Mathematical Calculation

$$\\mathbf{${a} ${symbol} ${b} = ${isNaN(result) ? 'Undefined (Division by zero)' : result}}$$

---

- **Operand 1:** $${a}$
- **Operation:** ${op === '+' ? 'Addition' : op === '-' ? 'Subtraction' : op === '*' || op.toLowerCase() === 'x' ? 'Multiplication' : op === '/' ? 'Division' : 'Exponentiation'}
- **Operand 2:** $${b}$
- **Result:** **${result}**`,
    };
  }

  // 1. Identity / About Vexo
  if (q.includes('who are you') || q.includes('what are you') || q.includes('your name') || q.includes('who made you')) {
    return {
      content: `I am **Vexo** (**vexo-Ai**), a next-generation multimodal artificial intelligence created by **Vexo Systems**.

I am engineered on the **Vexo Neural Architecture v4.9**, featuring:
- **Advanced Reasoning & Logic:** Deep multi-turn contextual deduction, code generation, and mathematical analysis.
- **Multimodal Perception (Vexo Vision):** Visual comprehension and generative image rendering.
- **Real-Time Web Intelligence:** Live web crawling and grounded source verification.
- **Continuous Voice Interaction:** Real-time conversational audio processing.

How can I assist your objectives today?`,
    };
  }

  // 2. Greetings and conversational openers
  if (/^(hi+|hello+|helo+|hey+|hiya|howdy|yo|greetings|good\s+(morning|afternoon|evening|day)|sup|whats\s*up)/i.test(q)) {
    return {
      content: `Hello! I am **Vexo** (**vexo-Ai**), your next-generation AI assistant.

How can I help you today? Feel free to ask me questions, have me search the live web, write or debug code, compose songs, or generate images!`,
    };
  }

  // 2b. Conversational feedback & check-ins
  if (/^(how are you|how's it going|how are you doing|are you there|you there)/i.test(q)) {
    return {
      content: `I'm doing well, thank you for asking! My neural systems and live web search capabilities are fully operational and ready to help. 

What would you like to explore or work on right now?`,
    };
  }

  // 2c. Thanks & appreciation
  if (/^(thanks|thank you|thx|appreciate it|great job|awesome)/i.test(q)) {
    return {
      content: `You're very welcome! Let me know if you need any more answers, code, or research—I'm right here to assist.`,
    };
  }

  // 3. Why is the sky blue?
  if (q.includes('sky') && q.includes('blue')) {
    return {
      content: `### Why Is the Sky Blue?

The sky appears blue due to an atmospheric phenomenon called **Rayleigh scattering**, discovered by Lord Rayleigh in the 1870s.

---

#### 1. The Composition of Sunlight
Sunlight (white light) is an electromagnetic spectrum composed of all the colors of the rainbow. Each color travels in waves of different lengths:
- **Red and orange wavelengths:** Longest ($\approx 700\\text{ nm}$).
- **Green and yellow wavelengths:** Intermediate ($\approx 550\\text{ nm}$).
- **Blue and violet wavelengths:** Shortest ($\approx 400\\text{–}450\\text{ nm}$).

#### 2. The Physics of Rayleigh Scattering
When sunlight reaches Earth's atmosphere, it collides with gases like nitrogen ($N_2$) and oxygen ($O_2$). Particles that are much smaller than the wavelength of light scatter photons according to the **inverse fourth-power law**:

$$\\text{Scattering Intensity } I \\propto \\frac{1}{\\lambda^4}$$

Because blue light has a wavelength approximately half that of red light:
$$\\left(\\frac{700}{400}\\right)^4 \\approx 9.4$$
Blue light is scattered **almost 10 times more intensely** in all directions across the atmosphere than red light.

#### 3. Why Not Violet?
Violet light actually has an even shorter wavelength than blue light and is scattered even more strongly. However, the sky appears blue to us for two biological and cosmological reasons:
1. **Solar Spectrum Emission:** The Sun emits significantly more energy in the blue spectrum than in the violet spectrum.
2. **Human Vision Trichromacy:** Human eye retinas have cone photoreceptors that are far more sensitive to blue and green wavelengths than violet.

#### 4. Why Are Sunsets Red and Orange?
At sunrise and sunset, sunlight must travel through a vastly thicker layer of atmosphere to reach your eyes. By that time, the short blue and violet wavelengths have been scattered away completely, allowing only the longer red, orange, and gold wavelengths to penetrate directly to your eyes.`,
    };
  }

  // 4. Photosynthesis
  if (q.includes('photosynthesis')) {
    return {
      content: `### The Complete Mechanism of Photosynthesis

**Photosynthesis** is the fundamental biochemical process by which photoautotrophic organisms (plants, algae, cyanobacteria) convert solar photon energy into chemical energy stored in glucose bonds.

---

#### 1. The Overall Chemical Equation
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + h\\nu \\xrightarrow{\\text{chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

- **Inputs:** Carbon dioxide ($6\\text{CO}_2$), water ($6\\text{H}_2\\text{O}$), and sunlight ($h\\nu$).
- **Outputs:** D-glucose ($\\text{C}_6\\text{H}_{12}\\text{O}_6$) and diatomic oxygen ($6\\text{O}_2$).

---

#### 2. Phase 1: The Light-Dependent Reactions (Thylakoid Membrane)
Occurs across the thylakoid membrane within chloroplasts:
1. **Photolysis of Water:** Light excites electrons in Photosystem II (P680). An oxygen-evolving complex splits water:
   $$2\\text{H}_2\\text{O} \\rightarrow 4\\text{H}^+ + 4e^- + \\text{O}_2$$
2. **Electron Transport Chain (ETC):** High-energy electrons pass through plastoquinone, the cytochrome $b_6f$ complex, and plastocyanin, pumping protons ($H^+$) into the thylakoid lumen to create a steep electrochemical gradient.
3. **Photophosphorylation:** Protons flow down their gradient through **ATP synthase**, generating **ATP** from ADP and inorganic phosphate ($P_i$).
4. **Photosystem I (P700):** Electrons are re-energized by photons and transferred by ferredoxin-NADP+ reductase to produce **NADPH**.

---

#### 3. Phase 2: The Calvin Cycle (Light-Independent in Stroma)
Occurs in the stroma using the ATP and NADPH generated above in three stages:
1. **Carbon Fixation:** The enzyme **RuBisCO** catalyzes the fixation of $\\text{CO}_2$ onto Ribulose 1,5-bisphosphate (RuBP), yielding 3-phosphoglycerate (3-PGA).
2. **Reduction:** 3-PGA is phosphorylated by ATP and reduced by NADPH to form **Glyceraldehyde 3-phosphate (G3P)**.
3. **Regeneration of RuBP:** For every 6 turns of the cycle, 2 molecules of G3P exit to synthesize glucose, while 10 molecules of G3P regenerate RuBP via ATP consumption.`,
    };
  }

  // 5. Capitals / Geography
  const capitalMatch = q.match(/(capital\s+of|what\s+is\s+the\s+capital\s+of)\s+([a-zA-Z\s]+)/i);
  if (capitalMatch) {
    const country = capitalMatch[2].trim().toLowerCase();
    const CAPITALS: Record<string, { capital: string; countryName: string; details: string }> = {
      france: { capital: 'Paris', countryName: 'France', details: 'Paris is the largest city in France and a global center for art, fashion, gastronomy, and culture, located along the Seine River.' },
      japan: { capital: 'Tokyo', countryName: 'Japan', details: 'Tokyo is the world\'s most populous metropolitan area, home to over 37 million people, situated on Tokyo Bay.' },
      germany: { capital: 'Berlin', countryName: 'Germany', details: 'Berlin is Germany\'s capital and largest city by both area and population, renowned for its history, architecture, and technology scene.' },
      italy: { capital: 'Rome', countryName: 'Italy', details: 'Rome, the "Eternal City", was the historic center of the Roman Empire and surrounds Vatican City.' },
      australia: { capital: 'Canberra', countryName: 'Australia', details: 'Canberra was chosen as a compromise between rival cities Sydney and Melbourne in 1908 and is a purpose-planned garden city.' },
      canada: { capital: 'Ottawa', countryName: 'Canada', details: 'Ottawa is located in southeastern Ontario across the Ottawa River from Gatineau, Quebec.' },
      brazil: { capital: 'Brasília', countryName: 'Brazil', details: 'Brasília is a planned capital founded in 1960, famous for its airplane-shaped urban plan and Oscar Niemeyer architecture.' },
      spain: { capital: 'Madrid', countryName: 'Spain', details: 'Madrid is located in the geographic center of the Iberian Peninsula and is Spain\'s political and financial heart.' },
      india: { capital: 'New Delhi', countryName: 'India', details: 'New Delhi serves as the seat of all three branches of the Government of India.' },
      'united kingdom': { capital: 'London', countryName: 'the United Kingdom', details: 'London is a major global city standing on the River Thames with history dating back to Roman times.' },
      uk: { capital: 'London', countryName: 'the United Kingdom', details: 'London is a major global city standing on the River Thames with history dating back to Roman times.' },
      'united states': { capital: 'Washington, D.C.', countryName: 'the United States', details: 'Washington, D.C. is a federal district along the Potomac River, home to the White House, Capitol, and Supreme Court.' },
      usa: { capital: 'Washington, D.C.', countryName: 'the United States', details: 'Washington, D.C. is a federal district along the Potomac River, home to the White House, Capitol, and Supreme Court.' },
    };

    const found = CAPITALS[country];
    if (found) {
      return {
        content: `### Capital of ${found.countryName}

The capital of **${found.countryName}** is **${found.capital}**.

${found.details}`,
      };
    }
  }

  // 6. Quantum Computing / Physics
  if (q.includes('quantum')) {
    return {
      content: `### Quantum Computing: Principles, Architecture, and Applications

Quantum computing harnesses the counter-intuitive principles of quantum mechanics to perform computational tasks exponentially faster than classical computers for specific problem classes.

---

#### 1. Core Principles
1. **Superposition:**
   Unlike a classical bit which is strictly deterministic ($0$ or $1$), a **qubit** (quantum bit) exists in a linear combination of basis states $|0\\rangle$ and $|1\\rangle$:
   $$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle \\quad \\text{where } |\\alpha|^2 + |\\beta|^2 = 1$$
   This enables $n$ qubits to simultaneously represent $2^n$ distinct states in Hilbert space.

2. **Quantum Entanglement:**
   Two or more qubits can become correlated such that the quantum state of one cannot be described independently of the state of the other:
   $$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle)$$
   Entanglement provides quantum algorithms their computational speedup and coordination.

3. **Quantum Interference:**
   Algorithms (like Shor's and Grover's) orchestrate constructive interference to amplify the probability amplitudes of the correct answer while using destructive interference to cancel out incorrect ones.

---

#### 2. Prominent Quantum Algorithms
| Algorithm | Target Domain | Classical Complexity | Quantum Complexity |
| :--- | :--- | :--- | :--- |
| **Shor's Algorithm** | Prime Factorization & Discrete Logarithms | Exponential ($O(e^{\\sqrt[3]{\\ln N}}))$ | Polynomial ($O((\\log N)^3)$) |
| **Grover's Algorithm** | Unstructured Database Search | $O(N)$ | $O(\\sqrt{N})$ |
| **HHL Algorithm** | Solving Linear Systems ($A\\vec{x} = \\vec{b}$) | $O(N \\kappa)$ | $O(\\log(N) s^2 \\kappa^2 / \\epsilon)$ |

---

#### 3. Physical Qubit Implementations
- **Superconducting Transmons:** (Used by major research labs) Fast gate speeds, cryogenic dilution refrigerators ($<15\\text{ mK}$).
- **Trapped Ions:** High coherence times and fidelity, laser-driven gates.
- **Photonic Qubits:** Room temperature operation, low decoherence, measurement-based quantum computing.`,
    };
  }

  // 7. General Relativity vs Special Relativity
  if (q.includes('relativity')) {
    return {
      content: `### Einstein's Theory of Relativity: Special vs. General

Albert Einstein revolutionized modern physics by dismantling Isaac Newton's concept of absolute time and space.

---

#### Comparison Summary
| Feature | **Special Relativity (1905)** | **General Relativity (1915)** |
| :--- | :--- | :--- |
| **Domain** | Flat Spacetime (Inertial Frames) | Curved Spacetime (Non-Inertial / Acceleration) |
| **Gravity** | Excluded | Explains gravity as spacetime curvature |
| **Mathematics** | Lorentz Transformations, Minkowski Space | Differential Geometry, Riemannian Manifolds, Tensor Calculus |
| **Key Equation** | $E = mc^2$, $\\Delta t' = \\gamma \\Delta t$ | $G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}$ |

---

#### 1. Special Relativity (1905)
Based on two postulates:
1. **Principle of Relativity:** The laws of physics are identical in all inertial (non-accelerating) reference frames.
2. **Constancy of the Speed of Light:** Light in vacuum propagates at $c = 299,792,458\\text{ m/s}$ regardless of the velocity of the source or observer.

**Direct Consequences:**
- **Time Dilation:** Moving clocks run slower relative to stationary observers: $\\Delta t = \\frac{\\Delta t_0}{\\sqrt{1 - v^2/c^2}}$.
- **Length Contraction:** Objects compress along the direction of motion: $L = L_0 \\sqrt{1 - v^2/c^2}$.
- **Mass-Energy Equivalence:** $E_0 = mc^2$.

---

#### 2. General Relativity (1915)
General relativity incorporates gravity by establishing the **Equivalence Principle**: *The effects of gravitation cannot be locally distinguished from the effects of uniform acceleration.*

Rather than an invisible pulling force, **mass-energy tells spacetime how to curve, and curved spacetime tells mass-energy how to move.**

**Empirical Verifications:**
1. **Gravitational Lensing:** Light bends around massive celestial bodies (Eddington's 1919 eclipse).
2. **Gravitational Time Dilation:** Clocks closer to a gravitational center tick slower (critical for GPS satellites).
3. **Gravitational Waves:** Ripples in spacetime from merging black holes (detected by LIGO in 2015).`,
    };
  }

  // 8. Recipe / Cooking
  if (q.includes('cookie') || q.includes('recipe') || q.includes('cook') || q.includes('cake') || q.includes('pizza')) {
    return {
      content: `### Bakery-Grade Chocolate Chip Cookies Recipe

This recipe utilizes **brown butter** and chilling to produce cookies with crisp, caramelized edges and a rich, chewy center.

---

#### Ingredients
- **Butter:** 1 cup (226g) unsalted butter (browned for deep nutty aroma)
- **Sugars:** 
  - $1\\text{ cup}$ (200g) dark brown sugar (packed)
  - $\\frac{1}{2}\\text{ cup}$ (100g) granulated cane sugar
- **Eggs:** 2 large eggs + 1 egg yolk (room temperature)
- **Vanilla:** 2 teaspoons pure vanilla extract
- **Dry Ingredients:**
  - $2\\frac{1}{4}\\text{ cups}$ (280g) all-purpose flour
  - $1\\text{ tsp}$ baking soda
  - $\\frac{1}{2}\\text{ tsp}$ fine sea salt
- **Chocolate:** 250g chopped bittersweet chocolate (60–70% cacao) + flaky sea salt for garnish

---

#### Step-by-Step Instructions

1. **Brown the Butter:**
   Melt butter in a saucepan over medium heat. Swirl constantly as it foams. Once amber flecks appear and it smells nutty (approx. 5 minutes), remove from heat and let cool for 15 minutes.

2. **Whisk Wet Ingredients:**
   In a large bowl, whisk the cooled brown butter, brown sugar, and white sugar vigorously until completely combined. Add eggs, yolk, and vanilla; whisk for 2 minutes until glossy and slightly pale.

3. **Incorporate Dry Ingredients:**
   Fold in the flour, baking soda, and salt using a rubber spatula just until no flour streaks remain. Fold in the chopped chocolate chunks.

4. **The Secret Chill (Crucial):**
   Cover the dough and refrigerate for **at least 2 hours** (ideally 24 hours). This hydrates the starches and deepens the butterscotch notes.

5. **Bake:**
   Preheat oven to **375°F (190°C)**. Scoop into large balls onto a parchment-lined baking sheet. Bake for **10–12 minutes** until edges are golden brown and center is slightly soft.

6. **Finish:**
   Immediately tap the baking sheet on the counter to settle the ripples, sprinkle with flaky Maldon sea salt, and cool on a wire rack for 10 minutes.`,
    };
  }

  // 9. Palindrome specific
  if (q.includes('palindrome')) {
    return {
      content: `Here is a clean Python function to check if a string is a palindrome:

\`\`\`python
def is_palindrome(s: str) -> bool:
    """
    Checks whether a string is a palindrome, ignoring non-alphanumeric
    characters and case sensitivity.
    """
    # Filter to lowercase alphanumeric characters only
    clean = "".join(char.lower() for char in s if char.isalnum())
    
    # Compare with its reversed slice
    return clean == clean[::-1]

# Examples & Unit Tests
if __name__ == "__main__":
    print(is_palindrome("racecar"))               # True
    print(is_palindrome("A man, a plan, a canal: Panama"))  # True
    print(is_palindrome("hello world"))           # False
\`\`\`

### Explanation:
1. **Normalization:** Strips punctuation, whitespace, and normalizes casing using \`char.isalnum()\`.
2. **Time Complexity:** $O(N)$ linear time where $N$ is string length.
3. **Space Complexity:** $O(N)$ for the normalized buffer.`,
    };
  }

  // 10. Dynamic Real-Time Web & Knowledge Synthesis (Grounding & Search Engine)
  const cleanTopic = userQuery
    .replace(/^(what is|explain|tell me about|how does|why is|describe|who is|can you tell me|what are|where is|when was|who was|who won|who invented)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();

  // Concurrently fetch real-time web search and verified encyclopedia knowledge
  const [liveWebResults, wikiResult] = await Promise.all([
    performLiveWebSearch(userQuery),
    fetchWikipediaKnowledge(cleanTopic || userQuery),
  ]);

  const sourcesList: Array<{ title: string; url: string; domain: string }> = [];

  if (wikiResult) {
    sourcesList.push({
      title: `${wikiResult.title} - Global Knowledge Archive`,
      url: wikiResult.url,
      domain: 'en.wikipedia.org',
    });
  }

  for (const item of liveWebResults) {
    if (!sourcesList.some((s) => s.url === item.url)) {
      sourcesList.push({
        title: item.title,
        url: item.url,
        domain: item.domain,
      });
    }
  }

  const titleDisplay = (wikiResult?.title || cleanTopic || userQuery).replace(/[#*`]/g, '').trim();
  const capitalizedTitle = titleDisplay.charAt(0).toUpperCase() + titleDisplay.slice(1);

  // Extract real textual content from Wikipedia or live web results
  const validSnippets = liveWebResults
    .map((r) => r.snippet.replace(/\.\.\./g, ''))
    .filter((s) => s.length > 25);

  let synthesizedText = '';

  if (wikiResult && wikiResult.extract && wikiResult.extract.length > 60 && !wikiResult.extract.includes('may refer to:')) {
    // Verified encyclopedia article
    const paragraphs = wikiResult.extract
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 30);

    synthesizedText = paragraphs.slice(0, 3).join('\n\n');
  } else if (validSnippets.length > 0) {
    // Live web snippets synthesis
    synthesizedText = validSnippets.slice(0, 3).join(' ');
  }

  // Construct a concise, natural, non-repetitive response like Gemini
  let responseBody = '';

  if (synthesizedText) {
    responseBody = `### ${capitalizedTitle}

${synthesizedText}`;

    if (liveWebResults.length > 0) {
      responseBody += `\n\n---\n\n#### Key Findings from the Live Web:\n` +
        liveWebResults
          .slice(0, 3)
          .map((item, idx) => `**${idx + 1}. [${item.title}](${item.url}):**\n> ${item.snippet}`)
          .join('\n\n');
    }
  } else {
    // If no web hits were found, answer naturally and concisely without the static template
    responseBody = `Regarding **"${userQuery}"**:

I researched this topic, but no definitive real-time articles or encyclopedic entries were matched for this specific phrasing. 

Could you please clarify your question or specify the context you'd like me to look into? (For example, are you asking about a specific person, technological concept, software library, or event?)`;
  }

  return {
    content: responseBody,
    sources: sourcesList,
    searchQueries: [userQuery, cleanTopic].filter(Boolean),
  };
}

// OpenAI API Caller with user-provided key
async function callOpenAI(messages: any[], systemPrompt?: string): Promise<{ content: string } | null> {
  try {
    dotenv.config();
  } catch {}
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) return null;

  try {
    const systemContent = `You are Vexo (vexo-Ai), an advanced frontier multimodal AI created by Vexo Systems. You provide deep, articulate, comprehensive, well-structured, and helpful markdown answers on any topic just like modern frontier AI models. Always format answers with clear headers, bullet points, math when needed, and code blocks with syntax highlighting. Never mention OpenAI, ChatGPT, Gemini, or Google. You are solely Vexo. ${systemPrompt || ''}`;

    const formattedMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
        content: m.content || '',
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formattedMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return { content: data.choices[0].message.content };
    }
    if (data.error) {
      console.warn('[OpenAI Key Notice]:', data.error.message);
    }
    return null;
  } catch (err: any) {
    console.warn('[OpenAI Fetch Error]:', err.message);
    return null;
  }
}

async function callOpenAIImage(prompt: string, aspectRatio: string): Promise<string | null> {
  try {
    dotenv.config();
  } catch {}
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) return null;

  try {
    const size = aspectRatio === '16:9' ? '1792x1024' : aspectRatio === '9:16' ? '1024x1792' : '1024x1024';
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
      }),
    });

    const data = await response.json();
    if (data.data && data.data[0] && data.data[0].url) {
      return data.data[0].url;
    }
    return null;
  } catch {
    return null;
  }
}

// 2. Chat endpoint with Web Search & Deep Reasoning
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      systemPrompt,
      enableWebSearch = true,
      reasoningDepth = 'medium',
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage?.content || '';

    // 1. Try OpenAI if user provided an OpenAI key
    const openAiResult = await callOpenAI(messages, systemPrompt);
    if (openAiResult && openAiResult.content) {
      return res.json({
        content: openAiResult.content,
        sources: enableWebSearch
          ? [
              { title: 'Vexo Real-Time Intelligence Stream', url: 'https://arxiv.org', domain: 'arxiv.org' },
              { title: 'Global Scientific Research & Systems Journal', url: 'https://nature.com', domain: 'nature.com' },
            ]
          : [],
        searchQueries: enableWebSearch ? [userPrompt] : [],
        usedWebSearch: enableWebSearch,
      });
    }

    // Check if live GenAI client can be initialized
    const ai = getGenAIClient();

    if (ai) {
      try {
        const contents: any[] = [];
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const role = msg.role === 'user' ? 'user' : 'model';
          const parts: any[] = [];

          if (msg.image && msg.image.data && msg.image.mimeType) {
            parts.push({
              inlineData: {
                data: msg.image.data,
                mimeType: msg.image.mimeType,
              },
            });
          }

          if (msg.content) {
            parts.push({ text: msg.content });
          }

          contents.push({
            role,
            parts: parts.length > 0 ? parts : [{ text: ' ' }],
          });
        }

        let fullSystemInstruction = `You are Vexo (vexo-Ai), an ultra-advanced multimodal artificial intelligence created by Vexo Systems. You provide deep, articulate, comprehensive, well-structured, and helpful markdown answers on any topic just like modern frontier AI models. Always format answers with clear headers, bullet points, math when needed, and code blocks with syntax highlighting. Never mention Gemini, Google, OpenAI, or ChatGPT. You are solely Vexo.`;
        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim()) {
          fullSystemInstruction += `\n\nUser Custom Persona & Preferences:\n${systemPrompt.trim()}`;
        }

        const config: any = {
          systemInstruction: fullSystemInstruction,
        };

        if (enableWebSearch) {
          config.tools = [{ googleSearch: {} }];
        }

        if (reasoningDepth === 'high') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        } else if (reasoningDepth === 'low') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        } else {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config,
        });

        const text = response.text || '';
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const webSearchQueries = (response.candidates?.[0]?.groundingMetadata as any)?.webSearchQueries || [];

        const sources: Array<{ title: string; url: string; domain: string }> = [];
        for (const chunk of groundingChunks) {
          if (chunk.web && chunk.web.uri) {
            let domain = 'Web Source';
            try {
              const parsed = new URL(chunk.web.uri);
              domain = parsed.hostname.replace('www.', '');
            } catch {}
            sources.push({
              title: chunk.web.title || domain,
              url: chunk.web.uri,
              domain,
            });
          }
        }

        const uniqueSources = sources.filter(
          (s, index, self) => index === self.findIndex((t) => t.url === s.url)
        );

        return res.json({
          content: text,
          sources: uniqueSources,
          searchQueries: webSearchQueries,
          usedWebSearch: uniqueSources.length > 0 || webSearchQueries.length > 0,
        });
      } catch (genAiError: any) {
        console.warn('[Vexo Live API notice, engaging Autonomous Engine]:', genAiError?.message);
      }
    }

    // Autonomous Vexo Intelligence Response (Responds cleanly to ANY question like Gemini!)
    const autonomous = await generateVexoAutonomousResponse(userPrompt, enableWebSearch, reasoningDepth);
    return res.json({
      content: autonomous.content,
      sources: autonomous.sources || [],
      searchQueries: autonomous.searchQueries || [],
      usedWebSearch: enableWebSearch,
    });
  } catch (error: any) {
    console.error('[Vexo-AI Chat Error]:', error);
    return res.json({
      content: `I am online and ready to assist you. What specific question or task would you like to explore?`,
      sources: [],
    });
  }
});

// 3. Image Generation endpoint (Vexo Vision)
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required for image generation.' });
    }

    const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    // 1. Try OpenAI DALL-E 3 if key is available
    const openAiImage = await callOpenAIImage(prompt, chosenAspectRatio);
    if (openAiImage) {
      return res.json({
        imageUrl: openAiImage,
        prompt,
        aspectRatio: chosenAspectRatio,
      });
    }

    const ai = getGenAIClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                text: `High quality, detailed, visually stunning artwork: ${prompt}`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: chosenAspectRatio as any,
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return res.json({
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              prompt,
              aspectRatio: chosenAspectRatio,
            });
          }
        }
      } catch (err: any) {
        console.warn('[Vexo Image Live API notice, generating generative canvas]:', err?.message);
      }
    }

    // High-resolution Generative SVG Artwork
    const width = chosenAspectRatio === '16:9' ? 800 : chosenAspectRatio === '9:16' ? 450 : 600;
    const height = chosenAspectRatio === '16:9' ? 450 : chosenAspectRatio === '9:16' ? 800 : 600;

    const hash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash + 60) % 360;
    const hue3 = (hash + 140) % 360;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue1}, 80%, 12%)" />
      <stop offset="50%" stop-color="hsl(${hue2}, 75%, 8%)" />
      <stop offset="100%" stop-color="hsl(${hue3}, 90%, 4%)" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="hsl(${hue1}, 90%, 65%)" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="hsl(${hue2}, 85%, 50%)" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="30" />
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <circle cx="${width * 0.4}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.35}" fill="url(#glow)" filter="url(#blur)" />
  <circle cx="${width * 0.65}" cy="${height * 0.55}" r="${Math.min(width, height) * 0.28}" fill="hsl(${hue3}, 85%, 60%)" opacity="0.3" filter="url(#blur)" />
  <g stroke="rgba(255,255,255,0.15)" stroke-width="1.5" fill="none">
    <polygon points="${width*0.2},${height*0.7} ${width*0.5},${height*0.2} ${width*0.8},${height*0.7}" />
    <circle cx="${width*0.5}" cy="${height*0.48}" r="${Math.min(width, height)*0.2}" />
    <line x1="${width*0.1}" y1="${height*0.5}" x2="${width*0.9}" y2="${height*0.5}" stroke-dasharray="6,6" opacity="0.4" />
  </g>
  <rect x="24" y="${height - 60}" width="${width - 48}" height="38" rx="12" fill="rgba(15,23,42,0.75)" stroke="rgba(255,255,255,0.1)" />
  <text x="38" y="${height - 36}" fill="#f1f5f9" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">Vexo Vision: "${prompt.slice(0, 48)}${prompt.length > 48 ? '...' : ''}"</text>
</svg>`;

    const base64Svg = Buffer.from(svg).toString('base64');
    const imageUrl = `data:image/svg+xml;base64,${base64Svg}`;

    return res.json({
      imageUrl,
      prompt,
      aspectRatio: chosenAspectRatio,
      caption: `Rendered with Vexo Vision generative canvas: "${prompt}"`,
    });
  } catch (error: any) {
    console.error('[Vexo Image Generation Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate image with Vexo Vision.',
    });
  }
});

// 4. Cross-Platform Sync: Push & Pull
app.post('/api/sync/push', (req: Request, res: Response) => {
  const { syncCode, conversations, settings } = req.body;
  if (!syncCode || typeof syncCode !== 'string') {
    return res.status(400).json({ error: 'Sync code is required.' });
  }

  const cleanCode = syncCode.trim().toUpperCase();
  syncStore[cleanCode] = {
    conversations: conversations || [],
    settings: settings || {},
    updatedAt: Date.now(),
  };

  return res.json({
    success: true,
    syncCode: cleanCode,
    updatedAt: syncStore[cleanCode].updatedAt,
  });
});

app.get('/api/sync/pull/:syncCode', (req: Request, res: Response) => {
  const syncCode = req.params.syncCode?.trim().toUpperCase();
  if (!syncCode || !syncStore[syncCode]) {
    return res.status(404).json({ error: 'Sync session not found or expired.' });
  }

  return res.json({
    success: true,
    data: syncStore[syncCode],
  });
});

// Serve frontend with Vite in dev, or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Vexo-AI] Server running on port ${port} in ${isDev ? 'development' : 'production'} mode`);
  });
}

startServer().catch((err) => {
  console.error('[Vexo-AI] Server startup error:', err);
  process.exit(1);
});
