import fs from 'fs';
import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';

const rawData = `
MASSAS (TARDE)
8480 | 008480 - ROTISSERIA MACARRONADA A BOLONHESA BENDITO KG |
8321 | 008321 - ROT.ESPAGUETE A BOLONHESA + POLPETONE RECHEADO BENDITO |
8400 | 008400 - ROTISSERIA LASANHA A BOLONHESA BENDITO KG | 0.45
8307 | 008307 - ROTISSERIA ESCONDIDINHO DE CARNE SECA BENDITO KG | 0.45
6878 | 006878 - ROT REFRIGERADO PANQUECA FRANGO C/CATUPIRY KG | 0.45
8571 | 008571 - ROTISSERIA POLENTA AO MOLHO CARNE MOIDA BENDITO KG | 0.45
8316 | 008316 - ROTISSERIA ESCONDIDINHO FRANGO BENDITO KG | 0.45
6879 | 006879 - ROT REFRIGERADO PANQUECA DE CARNE AO POMODORO | 0.25
6960 | 006960 - ROTISSERIA NHOQUE AO MOLHO SUGO KG | 0.4
8333 | 008333 - ROTISSERIA BATATA/RECHEADA BROCOLIS E BACON | 0.45
2771 | 002771 - ROT REFRIGERADO PANQUECA PRESUNTO MUSSARELA KG | 0.25
8663 | 008663 - ROTISSERIA RONDELE FRANGO REQUEIJAO BENDITO KG |
8332 | 008332 - ROTISSERIA BATATA/RECHEADA FRANGO C/ REQUEIJAO | 0.35
9067 | 009067 - ROTISSERIA PANQUECA MASSA ESPINAFRE C/PALMITO BENDITO KG | 0.25
9075 | 009075 - ROTISSERIA PANQUECA MASSA ESPINAFRE FRAN.CREAM.BENDITO KG | 0.25

MACARRÃO (ALMOÇO)
8480 | 008480 - ROTISSERIA MACARRONADA A BOLONHESA BENDITO KG | 0.35
8900 | 008900 - ROTISSERIA YAKISSOBA BENDITO KG | 0.35
93626 | 093626 - ROTISSERIA MACARRAO C/BROCOLIS E BACON KG | 0.35
8442 | 008442 - ROTISSERIA MACARRAO C/CALABRESA MOLHO ROSE BENDITO KG | 0.35
8321 | 008321 - ROT.ESPAGUETE A BOLONHESA + POLPETONE RECHEADO BENDITO | 1

MONO ARROZ (ALMOÇO)
8037 | 008037 - ROTISSERIA ARROZ CARRETEIRO BENDITO KG |
8023 | 008023 - ROTISSERIA ARROZ A GREGA BENDITO KG |
8028 | 008028 - ROTISSERIA ARROZ BRANCO BENDITO KG | 0.12

SALADAS COZIDAS (TARDE)
6857 | 006857 - ROTISSERIA MAIONESE DE LEGUMES COM FRANGO |
8482 | 008482 - ROTISSERIA MAIONESE DE LEGUMES COM FRANGO BENDITO KG |
8221 | 008221 - ROTISSERIA CAPONATA BERINJELA BENDITO KG | 0.35
8695 | 008695 - ROTISSERIA SALADA DE BETERRABA BENDITO KG | 0.35
8690 | 008690 - ROTISSERIA SALADA DE BATATA CURTINHA BENDITO KG | 0.35
8671 | 008671 - ROTISSERIA SALADA BATATONESE BENDITO KG | 0.35
8789 | 008789 - ROTISSERIA SALADA SUNOMONO BENDITOKG | 0.35
8713 | 008713 - ROTISSERIA SALADA DE GRAO DE BICO BENDITO KG | 0.35
8687 | 008687 - ROTISSERIA SALADA CENOURA C/VAGEM BENDITO KG | 0.35
8839 | 008839 - ROTISSERIA TABULE BENDITO KG | 0.35

MONO FEIJÃO (ALMOÇO)
8328 | 008328 - ROTISSERIA FEIJAO BENDITO KG | 0.18
8336 | 008336 - ROTISSERIA FEIJOADA BENDITO KG | 0.35

MONO GUARNIÇÃO (ALMOÇO)
8089 | 008089 - ROTISSERIA BATATA ASSADA BENDITO KG | 0.15
8080 | 008080 - ROTISSERIA BANANA BENDITO KG | 0.12
8292 | 008292 - ROTISSERIA CREME DE MILHO BENDITO KG |
8598 | 008598 - ROTISSERIA PURE DE BATATA BENDITO KG | 0.12
8279 | 008279 - ROTISSERIA COUVE FLOR EMPANADA BENDITO KG | 0.15
6873 | 006873 - ROT REFRIGERADO FAROFA KG |
8391 | 008391 - ROTISSERIA JILO FRITO BENDITO KG | 0.08
8403 | 008403 - ROTISSERIA LEGUMES BENDITO KG | 0.15
8153 | 008153 - ROTISSERIA BERINJELA PIZZAOLA BENDITO KG | 0.1
8323 | 008323 - ROTISSERIA FAROFA BENDITO KG | 0.12

MONO PROTEINAS (ALMOÇO)
8409 | 008409 - ROTISSERIA LINGUICA ASSADA BENDITO KG | 0.12
8491 | 008491 - ROTISSERIA MEDALHAO FRANGO BENDITO KG | 0.15
8349 | 008349 - ROTISSERIA FILE FRANGO PARMEGIANA BENDITO KG | 0.15
8804 | 008804 - ROTISSERIA SOBRECOXA RECHEADA BENDITO KG | 0.2
8381 | 008381 - ROTISSERIA FRANGO XADREZ BENDITO KG | 0.15
8361 | 008361 - ROTISSERIA FILE SOBRECOXA ASSADA BENDITO KG | 1
8945 | 008945 - ROT.ISCA DE FRANGO A MILANESA BENDITO KG |
8602 | 008602 - ROTISSERIA QUIBE ASSADO BENDITO KG | 0.15
8158 | 008158 - ROTISSERIA BIFE A ROLE BENDITO KG | 0.15
8006 | 008006 - ROTISSERIA ALMONDEGAS AO MOLHO BENDITO KG |
8834 | 008834 - ROTISSERIA STROGONOFF DE CARNE BENDITO KG | 0.15
8396 | 008396 - ROTISSERIA LAGARTO AO MOLHO MADEIRA BENDITO KG |
8231 | 008231 - ROTISSERIA CHARUTO BENDITO KG |
8837 | 008837 - ROTISSERIA STROGONOFF DE FRANGO BENDITO KG | 0.15
8284 | 008284 - ROTISSERIA COXA SOBRECOXA ASSADA BENDITO KG | 0.15
8519 | 008519 - ROTISSERIA COXINHA BUFALO WINGS KG |
8298 | 008298 - ROTISSERIA DOBRADINHA BENDITO KG | 0.35

CARNES ASSADAS (SABADO / DOMINGO)
93583 | 093583 - ASS.FRANGO BENDITO INTEIRO |
2893 | 002893 - ASS.FRANGO METADE BENDITO UNIDADE | 1
93964 | 093964 - ROTISSERIA CUPIM ASSADO MOLHO ALHO KG |
8484 | 008484 - ROTISSERIA MAMINHA ASSADA BENDITO KG | 0.65
8274 | 008274 - ROTISSERIA COSTELINHA PORCO MOLHO BARBECUE BENDITO KG |
8393 | 008393 - ROTISSERIA JOELHO PORCO ASSADO BENDITO KG |
7652 | 007652 - REFEICAO COXA SOBRECOXA ASSADA BENDITO UN |
8523 | 008523 - ROTISSERIA TULIPA BUFALO WINGS KG | 0.35
8396 | 008396 - ROTISSERIA LAGARTO AO MOLHO MADEIRA BENDITO KG |

SALADAS PRÓTEICAS (TARDE)
8963 | 008963 - ROTISSERIA SALADA CEASER C/FRANGO BENDITO | 1
8962 | 008962 - ROTISSERIA SALADA MIX DE FOLHA E LEGUMES C/PROTEINAS BENDITO | 1

SUSHI (TARDE)
9124 | 009124 - ROTISSERIA HOT HOLL BENDITO UN | 1
9123 | 009123 - ROTISSERIA SUSHI KANI C/CREAM CHEESE BENDITO UN | 1
9119 | 009119 - ROTISSERIA CALIFORNIA BENDITO UN | 1

POKE/TEMAKI (ALMOÇO)
9129 | 009129 - ROTISSERIA SALADA POKE DE SHIMEJI BENDITO UN |
9289 | 009289 - ROTISSERIA TEMAKI HOT SALMAO GRELAHADO |

MOLHOS (TARDE)
7570 | 007570 - MOLHO PESTO BENDITO KG | 4
8386 | 008386 - ROTISSERIA GELEIA DE PIMENTA BENDITO KG | 0.12
8551 | 008551 - ROTISSERIA PATE ALHO BENDITO KG | 0.12
8498 | 008498 - ROTISSERIA MOLHO PIMENTA ARTESANAL BENDITO KG | 0.12

PATES (TARDE)
7575 | 007575 - PATE DE AZEITONA VERDE BENDITO KG | 0.15
7576 | 007576 - PATE DE GORGONZOLA BENDITO KG | 0.15
8079 | 008079 - PATE DE NOZES BENDITO KG | 0.15
7574 | 007574 - PATE DE AZEITONA PRETA BENDITO KG | 0.15
`;

async function main() {
    console.log("🛠️ REGISTRANDO TODOS OS PRODUTOS EM MASSA 🛠️");

    // 1. Carregar as categorias atuais para não duplicar e encontrar IDs
    const currentTreeSnap = await getDocs(query(collection(db, 'CategoryTree'), where("type", "==", "produtos")));
    const categoryMap = {}; // name.toLowerCase() -> id

    currentTreeSnap.docs.forEach(d => {
        categoryMap[d.data().name.toLowerCase().trim()] = d.id;
    });

    // Função auxiliar para procurar/criar categoria
    async function getOrCreateCategory(catName) {
        catName = catName.trim();
        const key = catName.toLowerCase();

        if (categoryMap[key]) {
            return categoryMap[key];
        }

        console.log(`Criando nova categoria de Produto: ${catName}`);
        const newCatRef = doc(collection(db, "Category"));
        const categoryId = newCatRef.id;

        await setDoc(newCatRef, {
            name: catName,
            type: 'produtos',
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, "CategoryTree", categoryId), {
            name: catName,
            type: 'produtos',
            active: true,
            level: 1,
            parent_id: null,
            order: 99,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        categoryMap[key] = categoryId; // cache local
        return categoryId;
    }


    const lines = rawData.split('\n');
    let currentCategory = null;
    let currentCategoryId = null;

    let itemsProcessed = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Se a linha não contiver o pipe "|", tratamos como cabeçalho de Categoria
        if (!trimmed.includes('|')) {
            currentCategory = trimmed;
            currentCategoryId = await getOrCreateCategory(currentCategory);
            console.log(`\n📂 Entrando na categoria: ${currentCategory}`);
            continue;
        }

        // Se tiver pipe, é um produto
        // Exemplo: 8400 | 008400 - ROTISSERIA LASANHA A BOLONHESA BENDITO KG | 0.45
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
            const productCode = parts[0].trim();
            const productName = parts[1].trim(); // Pega apenas A INFORMAÇÃO Central!

            // Tenta pegar o peso se houver terceira parte
            let productWeight = 0;
            if (parts.length >= 3 && parts[2].trim()) {
                const weightStr = parts[2].trim().replace(',', '.');
                productWeight = parseFloat(weightStr);
                if (isNaN(productWeight)) productWeight = 0;
            }

            if (!productName || !currentCategoryId) continue;

            // Procurando se o Produto já existe pelo Nome (match exato)
            const prodSnap = await getDocs(query(collection(db, 'Product'), where("name", "==", productName)));
            let prodId = null;

            if (!prodSnap.empty) {
                prodId = prodSnap.docs[0].id;
                // console.log(`   🔸 Atualizando ${productName} (ID: ${prodId})`);
            } else {
                const newProdRef = doc(collection(db, "Product"));
                prodId = newProdRef.id;
                // console.log(`   ➕ Criando novo ${productName} (ID: ${prodId})`);
            }

            // Atualiza / Insere
            await setDoc(doc(db, 'Product', prodId), {
                name: productName,
                code: productCode,
                weigh_base: productWeight || null, // Se for 0/null, só salva sem peso bruto
                category: currentCategory,
                category_id: currentCategoryId,
                type: 'produtos', // Isso é vital para separar receitas/produtos
                active: true,
                updatedAt: serverTimestamp()
            }, { merge: true });

            itemsProcessed++;
            console.log(`   ✅ Gravado: [${productCode}] ${productName} (${currentCategory}) | Peso: ${productWeight || 'N/A'}`);
        }
    }

    console.log(`\n🎉 PROCESSO CONCLUÍDO! Puxei somente a parte descritiva (e pesos). Total de produtos inseridos/atualizados: ${itemsProcessed}`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
