import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';

const RAW_DATA = `
ACOMPANHAMENTO
HNsCyxQlPnJPzbVopFeH | Creme de Milho
q2FNEhQoYwxjLnbRBMOR | Purê de Batata
tvFXKhVtvozz6RTHZAF5 | Banana Frita
k68YlCzcE3fXfw5gM6ru | Batata Assada
taDiJgxSkF4KetJHIAah | Batata Recheada Brócolis e Bacon
M82i68gnCtT5lsSgQXzP | Berinjela Pizzaiola
ktGWBg0y8GBi2MJuvK0y | Canelone Presunto e Queijo ao Molho Branco
5dRMRpeQ8aUDSp44YrHE | Charuto
IwaOmr8rG4FS5lb3ptlD | Couve Refogada
HPyUqG0KBTWHlIOQpCi3 | Couve-flor Empanada
M2ouoDNAsfrLdjVw2kEU | Creme de Legumes
J5CEXxIv0D1Qj0isrjc7 | Ervilha Fresca
UmsXDj3chTOGiJuBMUOA | Escondidinho de Calabresa
Lx669q6bhUZveaX4j5H4 | Escondidinho de Carne Seca
R3ojMVdTdTdbXXixEEgh | Escondidinho de Frango
56dVpHffcJ0YnD1dg5sz | Espaguete à Bolonhesa
zF5SDjA8Ig8DKJam9L9I | Jiló Frito
Aj0kZDGgLnbUG4D68lPI | Lasanha à Bolonhesa
exMfd6SJYQZpLsh7yg6f | Legumes
msL2HvQm56r5TScIljt9 | Linguiça Assada
NtwdvHKg2BGDeup6fBS1 | Macarrão c/ Brócolis e Bacon
Gr8h5Re2Tc8ppfOjRWei | Macarrão c/ Calabresa Molho Rosé
VLn7H3Gg9DSmOf9EnWJm | Macarrão c/ Cheddar e Bacon
aCe5MKYpFsVYGPYo3GvH | Macarrão Caprese
I5dvSkbCZmRj3MQugpC6 | Macarronada à Bolonhesa
v963nUoQXkybMlOTPtiS | Nhoque ao Molho Sugo
C6fuO2smajYy2n81ZFzT | Panqueca de Carne ao Pomodoro
tP0tzCuI5GFErQLddP8O | Panqueca Frango c/ Requeijão
wJw0cwRc0j4roKvtRR8d | Panqueca Presunto e Mussarela
CJ6CK6jJLlBvpl0X9kMy | Polenta ao Molho de Carne Moída
URZVpAm1vCFrqq3gazaM | Purê de Cabotiá
nH4mRXcnmNyL2HsSJ7RT | Rondelli Frango Requeijão
YuInhLGo236LXugUOPnu | Yakissoba

AVES
yTX8kcpnIzpZNVYdL7Ra | Coxa Sobrecoxa Assada
koLhxBwOPo7GBOtCKxvc | Filé de Frango à Milanesa
ZegwVvSc6XbtvjlnmasE | Filé Frango Parmegiana
k0WCsZxV9t7xcp2jv6gU | Filé Sobrecoxa Assada
Qv9IKE6tFMzCoyZh9mZo | Frango Inteiro
Mt8n6rn5OjHhTy4eNmMY | Frango Metade
PWUuygvPSfBYLt8EflMC | Frango Xadrez
phHR7lA0r87NTLF1rEGK | Isca de Frango à Milanesa
saVZY4v0pvihxRGc62Vi | Isca de Frango Acebolada
jJZ8PaarNsVSQgS3WhkE | Medalhão de Frango
R7GepHhM1kTYuybSy3PV | Sobrecoxa Recheada
h890ekRtkAstA2iaOlDa | Strogonoff de Frango
FR0z8f6AQ7CkZLAvF0PQ | Tulipa Buffalo Wings

BOVINO
cszlLGLs4eBpe8VAWmuQ | Carne de Panela
98URiyjlftyaWcO5e5mL | Cupim Assado Molho Alho
B3XezObdBbMI33zBEGhR | Iscas de Carne Oriental
jBxJtOb9iTj9WIduOfSn | Kafta Recheada com Queijo
6fqDgNqOugKmM9zZ2SKB | Lagarto M. Madeira
nlJzzyNqJdmntnUFK2OU | Maminha Assada
odohJfPcU2vGAeQOIKs5 | Polpetone Recheado
CIG0Qpprqgo7SoMsHU5l | Quibe Assado
ppfc2vdOZQNUPrm1yBcq | Strogonoff de Carne
pZBcr59WtJ7Q9u29p4wM | Tirinha de Carne Chinesa
XlasAS8Uq0niKJua1ARp | Bife à Rolê

GUARNIÇÃO
AGwXNqj2hvtBPvCEvv9K | Arroz à Grega
AAh0peMpESccBl96ONdm | Arroz Branco
16i2ef8aT2V9V3hQlGVQ | Arroz Carreteiro
xh7Qfk29zhz1IeqeHr8M | Farofa
Pk5BRyCMALzo3vY5Z3cA | Feijão

Molhos, Patês e geleias
Y7ot2DXjAW8VanE6QhHQ | Patê de Nozes
gNOkEIgT3ypUOKpIRM2E | Pate de Azeitona Verde
6SRIzB7dj3rasITlA3wZ | Pate de Nozes
mA7RplhUzO6HRygTee8i | Molho de Tomate Rústico (assado)
6Dwr30vF1JnCd8gSW2m0 | Geleia de Pimenta
ElZa9PraH1bOpGcAMusU | Molho Pesto
DrruI4weh6puEm4LhRFR | Molho Pimenta Artesanal
CbKMcGQDr9Itxl57NYhh | Patê de Alho

SALADAS
tt6prcYy7jNddXK0Zhtb | Caponata de Berinjela
U459feLvtROrQIxmczmH | Maionese de Legumes com Frango
CFWDqVu8Rn6jESiiGQfv | Salada Batatonese
Bw0s0WS7lJGjBSrCh5tT | Salada Caesar c/ Frango
Q3Xck5sGtfztn4RrY85h | Salada Cenoura c/ Vagem
VJL0yHtpUUj3nqkDlOdL | Salada de Batata Curtinha
3SmKPaEP9ysOKAKz9dwq | Salada de Beterraba
NA9jUrFJuqGfOsfsYKcU | Salada Mix Folhas e Legumes c/ Proteínas
vPcivFGlhJwkhXChsYJG | Salada Sunomono
BaF55UlZUfN4mEu9OY16 | Tabule

SUSHI E JAPONESA
Ra2xKJllb3e8TCHf6J90 | California Roll
epv2HQdh3Qe3Gu96J4sN | Hot Roll
cTVV9BPT0eHveS2kpNMe | Poke de Kani
OdkSYtGRa99LfIZZKIow | Poke de Shimeji
1lrK3pOGbWaeXEjs03bO | Sushi Kani c/ Cream Cheese
9XluLkxYgkRj0oHoAzuB | Temaki Hot Salmão Grelhado

SUÍNOS
uJpzbdUjdvolWsO87aVC | Copa Lombo Acebolado
b8OpQRREqsfKWPjljVCZ | Copa Lombo Suína à Milanesa
eZPgfGR7kDXI9yi4JLhM | Joelho de Porco Assado
Oq7xLJK2X29E6ploRszu | Linguiça Recheada Assada
5hmansdk89DGS3V0npCg | Linguiça Toscana Assada
dVvdQwAeilbdvS09NO18 | Pernil ao Molho Ferrugem
wmVyEFDZ1tMsIA9Eln4i | Dobradinha
ymzGfx74sVtJXSUPfAMj | Feijoada
`;

// Helper: Converter para camel case apropriado (ex: MOLHOS -> Molhos) e capitalizar palavras
function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ')
        .map(word => {
            if (word.toLowerCase() === 'e' || word.toLowerCase() === 'de') return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

async function getOrCreateCategory(catName) {
    const formattedName = capitalizeWords(catName.trim());

    // Check in CategoryTree first
    const treeRef = collection(db, 'CategoryTree');
    const qTree = query(treeRef, where('name', '==', formattedName), where('type', '==', 'receitas'));
    const treeSnap = await getDocs(qTree);

    if (!treeSnap.empty) {
        return {
            id: treeSnap.docs[0].id,
            name: treeSnap.docs[0].data().name
        };
    }

    // Check in legacy Category (just in case they exist differently)
    const catRef = collection(db, 'Category');
    const qCat = query(catRef, where('name', '==', formattedName), where('type', '==', 'receitas'));
    const catSnap = await getDocs(qCat);

    // Fallback ID
    let categoryId = catSnap.empty ? doc(collection(db, 'Category')).id : catSnap.docs[0].id;

    console.log(`[Nova Categoria] Criando categoria em CategoryTree: ${formattedName}`);

    // Create new node in CategoryTree
    await setDoc(doc(db, 'CategoryTree', categoryId), {
        name: formattedName,
        type: 'receitas',
        level: 1,
        parent_id: null,
        description: `Categoria raiz para ${formattedName} de receitas`,
        active: true,
        order: 99,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Preserve legacy format if necessary or ignore.
    if (catSnap.empty) {
        await setDoc(doc(db, 'Category', categoryId), {
            name: formattedName,
            description: formattedName,
            type: 'receitas',
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    return { id: categoryId, name: formattedName };
}

async function main() {
    console.log("🛠️ INICIANDO PREENCHIMENTO EM MASSA DE RECEITAS V2 🛠️\n");

    const lines = RAW_DATA.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    let currentCategoryName = "";
    let processedCategories = {}; // cache
    let successCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Verifica se é uma linha de categoria (não tem o símbolo |)
        if (!line.includes('|')) {
            currentCategoryName = capitalizeWords(line);
            console.log(`\n📂 Entrando na categoria: ${currentCategoryName}`);

            if (!processedCategories[currentCategoryName]) {
                processedCategories[currentCategoryName] = await getOrCreateCategory(currentCategoryName);
            }
            continue;
        }

        // Se tem o '|', é uma receita.
        // Formato: HNsCyxQlPnJPzbVopFeH | Creme de Milho
        const parts = line.split('|');
        if (parts.length >= 2) {
            const recipeName = parts[1].trim();
            const categoryObj = processedCategories[currentCategoryName];

            if (!categoryObj) {
                console.warn(`Aviso: Categoria não encontrada para a receita ${recipeName}. Pulando...`);
                continue;
            }

            // Check if recipe already exists to avoid duplication by name
            const recipeQuery = query(collection(db, 'Recipe'), where('name', '==', recipeName));
            const recipeSnap = await getDocs(recipeQuery);

            const recipeDoc = recipeSnap.empty ? doc(collection(db, 'Recipe')) : recipeSnap.docs[0].ref;

            await setDoc(recipeDoc, {
                name: recipeName,
                category: categoryObj.name, // Campo legado / suporte
                category_name: categoryObj.name, // Novo campo preferencial do frontzinho
                category_id: categoryObj.id,
                active: true,
                updatedAt: serverTimestamp(),
                // Se o doc não existir, `setDoc` vai criar e preencher esses default fields.
                ...(recipeSnap.empty ? {
                    createdAt: serverTimestamp(),
                    yield_amount: 1,
                    yield_unit: 'un',
                    prep_time: 0,
                    cost_per_unit: 0,
                    total_cost: 0,
                    margin: 0,
                    suggested_price: 0
                } : {})
            }, { merge: true });

            console.log(` ✅ Receita processada: ${recipeName} (Cat: ${categoryObj.name}) - Status: Ativo`);
            successCount++;
        }
    }

    console.log(`\n🎉 Processamento concluído: ${successCount} receitas gravadas/atualizadas no Firebase!`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
