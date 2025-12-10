// config.js
const APP_VERSION = "8.2";

const firebaseConfig = {
  apiKey: "AIzaSyAElu-JLX7yAJJ4vEnR4SMZGn0zf93KvCQ",
  authDomain: "codeninjas-dashboard.firebaseapp.com",
  projectId: "codeninjas-dashboard",
  storageBucket: "codeninjas-dashboard.firebasestorage.app",
  messagingSenderId: "71590347120",
  appId: "1:71590347120:web:5f53a55cd7ffc280fd8fb5"
};

const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; 

const DEFAULT_FILAMENTS = [
    "Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", 
    "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black",
    "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", 
    "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal",
    "Glow in Dark Blue", "Translucent Red", "Silk Blue Hawaii", "Wood Black Walnut", 
    "Metal Iridium Gold", "Metal Copper Brown", "Metal Iron Gray", "Silk+ Gold", 
    "PETG Translucent Clear", "Flashforge Burnt Titanium", "Rock PLA Mars Red", 
    "Elegoo Burgundy Red", "PLA-CF Burgundy Red", "Polylite PETG Gray"
];

// Default Mock Data
const defaultNews = [{ id: "n1", title: "Minecraft Night", date: "Nov 22", badge: "SOON" }];
const defaultRules = [{ id: "r1", title: "General", desc: "Respect the Dojo equipment.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Uniform", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Star", cost: "50", tier: "tier1", category: "standard", icon: "fa-star", visible: true }];
const mockLeaderboard = [{ id: "l1", name: "Asher C.", points: 1250, belt: "Blue", username: "asher.cullin" }];