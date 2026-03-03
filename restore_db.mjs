
import fs from 'fs';
import { db } from './lib/firebase.js';
import { collection, doc, deleteDoc, getDocsFromServer, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';

async function main() {
    console.log("🛠️ INICIANDO RESTAURAÇÃO TOTAL DO BANCO DE DADOS 🛠️");

    // 1. Limpar Coleções de Receitas e Categorias para começar zerado
    console.log("🧹 1. Limpando possíveis resíduos (Recipes, Products, Categories)...");
    const toDelete = ['Recipe', 'Product', 'Category'];
    for (const col of toDelete) {
        const snap = await getDocsFromServer(collection(db, col));
        let count = 0;
        for (const d of snap.docs) {
            await deleteDoc(doc(db, col, d.id));
            count++;
        }
        console.log(`   - Limpos ${count} documentos de ${col}`);
    }

    // 2. Criar as Novas Categorias Oficiais
    console.log("\n📦 2. Criando Categorias Oficiais...");
    const baseCategorias = [
        "Guarnição",
        "Bovino",
        "Aves",
        "Pescado",
        "Refogado",
        "Saladas",
        "Acompanhamento",
        "Suínos",
        "Molhos e Patês",
        "Sushi e Japonesa"
    ];

    const categoryMap = {}; // nome -> id

    // Deixar as categorias de 'produtos' (para as marmitas e afins, se necessário) separadas.
    // Mas o usuário pediu focado nas Receitas. Vou criar tbm uma categoria extra para "Refeições" pra não perder dados.
    baseCategorias.push("Refeições / Produtos");

    for (const catName of baseCategorias) {
        const catType = catName === "Refeições / Produtos" ? "produtos" : "receitas";
        const docRef = await addDoc(collection(db, "Category"), {
            name: catName,
            type: catType,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        categoryMap[catName.toLowerCase()] = docRef.id;
        console.log(`   ✅ Categoria Criada: ${catName} (${docRef.id})`);
    }

    // Função de de-para automático de Categoria Antiga -> Categoria Nova
    const mapCategory = (oldCat) => {
        const lower = oldCat.toLowerCase();
        if (lower.includes('ave') || lower.includes('frango')) return categoryMap['aves'];
        if (lower.includes('bovin') || lower.includes('carne')) return categoryMap['bovino'];
        if (lower.includes('suíno') || lower.includes('suino')) return categoryMap['suínos'];
        if (lower.includes('pescad') || lower.includes('peixe')) return categoryMap['pescado'];
        if (lower.includes('salada')) return categoryMap['saladas'];
        if (lower.includes('molho') || lower.includes('pate') || lower.includes('patê')) return categoryMap['molhos e patês'];
        if (lower.includes('sushi') || lower.includes('japonesa') || lower.includes('2r8')) return categoryMap['sushi e japonesa'];
        if (lower.includes('guarn') || lower.includes('arroz') || lower.includes('feijao') || lower.includes('feijão') || lower.includes('macarr') || lower.includes('massa')) return categoryMap['guarnição'];
        if (lower.includes('acompanha')) return categoryMap['acompanhamento'];
        if (lower.includes('refei') || lower.includes('marmit') || lower.includes('produto')) return categoryMap['refeições / produtos'];

        // Default para o que sobrar
        return categoryMap['acompanhamento'];
    };

    // 3. Ler o Relatório de Backup e Parsear
    console.log("\n📖 3. Lendo Relatorio_Receitas_e_Produtos.txt...");
    const reportPath = 'C:\\Users\\Administrador\\Desktop\\Relatorio_Receitas_e_Produtos.txt';

    if (!fs.existsSync(reportPath)) {
        console.error("❌ ERRO: Relatorio não encontrado! Impossível restaurar.");
        process.exit(1);
    }

    const lines = fs.readFileSync(reportPath, 'utf8').split('\n');
    let currentMode = "NONE"; // RECIPE ou PRODUCT
    let currentOldCategory = "";

    let injectedRecipes = 0;
    let injectedProducts = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.includes('RELATÓRIO DE RECEITAS ATIVAS')) currentMode = "RECIPE";
        else if (line.includes('RELATÓRIO DE PRODUTOS')) currentMode = "PRODUCT";

        // Pega a Categoria Antiga
        if (line.startsWith('[') && line.endsWith(']')) {
            currentOldCategory = line.substring(1, line.length - 1).trim();
            continue;
        }

        // Pega o Item
        if (line.startsWith('- ')) {
            const newCatId = mapCategory(currentOldCategory);

            if (currentMode === "RECIPE") {
                const recipeName = line.replace('- ', '').trim();
                if (recipeName === 'Nome' || !recipeName) continue;

                await addDoc(collection(db, "Recipe"), {
                    name: recipeName,
                    category_id: newCatId,
                    active: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    components: [], // Ficam vazios para preencher dps
                    yield_kg: 1
                });
                injectedRecipes++;
            }
            else if (currentMode === "PRODUCT") {
                // Linha é algo como: - Código: 8221   | Rotisseria Caponata Berinjela Bendito KG
                const parts = line.split('|');
                if (parts.length === 2) {
                    const codePart = parts[0].replace('- Código:', '').trim();
                    const prodName = parts[1].trim();

                    // Se "S/ CODIGO", deixa string vazia pra gerar dps ou salvar assim
                    const finalCode = codePart === "S/ CODIGO" ? "" : codePart;

                    await addDoc(collection(db, "Product"), {
                        name: prodName,
                        code: finalCode,
                        id_vr: finalCode, // Salva o codigo no VR tb caso seja
                        category_id: newCatId,
                        active: true,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        price: 0
                    });
                    injectedProducts++;
                }
            }
        }
    }

    console.log(`\n🎉 RESTAURAÇÃO CONCLUÍDA COM SUCESSO!`);
    console.log(`   🔹 Receitas Salvas: ${injectedRecipes}`);
    console.log(`   🔹 Produtos Salvos: ${injectedProducts}`);
    console.log(`   🔹 Categorias Novas: ${baseCategorias.length}`);

    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
