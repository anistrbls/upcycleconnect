const fs = require('fs');
const file = 'c:/Users/atrabelsi/.gemini/antigravity/scratch/upcycleconnect/frontend/src/app/(admin)/parametres/[subpage]/page.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
/<<<<<<< HEAD\r?\nimport { Loader2, Bell, Settings, Sun, Moon, Check, CreditCard, Activity, Search, Filter } from "lucide-react";\r?\n=======\r?\nimport { Loader2, Bell, Settings, Sun, Moon, Check, ChevronDown, Package, Wrench, BookOpen } from "lucide-react";\r?\n>>>>>>> [a-f0-9]+ \(.*\)/,
'import { Loader2, Bell, Settings, Sun, Moon, Check, ChevronDown, Package, Wrench, BookOpen, CreditCard, Activity, Search, Filter } from "lucide-react";'
);

content = content.replace(
/<<<<<<< HEAD\r?\n                        {roleLabel}\r?\n=======\r?\n                        {user\?\\.role === "salarie" \? "Espace Salarié" : isPro \? "Espace Pro" : "Espace particulier"}\r?\n>>>>>>> [a-f0-9]+ \(.*\)/,
'                        {roleLabel}'
);

content = content.replace(
/<<<<<<< HEAD\r?\n    const isAdmin = user\?\\.role === "admin";\r?\n    const roleLabel = isAdmin \? "Administration" : isPro \? "Espace Pro" : "Espace particulier";\r?\n=======\r?\n    const isSalarie = user\?\\.role === "salarie";/,
\    const isSalarie = user?.role === "salarie";
    const isAdmin = user?.role === "admin";
    const roleLabel = isAdmin ? "Administration" : isSalarie ? "Espace Salarié" : isPro ? "Espace Pro" : "Espace particulier";\
);

content = content.replace(
/\r?\n>>>>>>> [a-f0-9]+ \(.*\)/g,
''
);

fs.writeFileSync(file, content, 'utf8');
console.log("Resolved conflicts");
