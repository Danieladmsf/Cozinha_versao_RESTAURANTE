import fs from 'fs';
import { db } from '../lib/firebase.js';
import { collection, getDocs, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';

const rawData = `
Arroz à Grega
Ativo
Guarnição

Arroz Branco
Ativo
Guarnição

Arroz Carreteiro
Ativo
Guarnição

Banana Frita
Ativo
Guarnição

Batata Assada
Ativo
Guarnição

Batata Recheada Brócolis e Bacon
Ativo
Guarnição

Berinjela Pizzaiola
Ativo
Guarnição

California Roll
Ativo
Sushi e Japonesa

Canelone Presunto e Queijo ao Molho Branco
Ativo
Guarnição

Caponata de Berinjela
Ativo
Saladas

Carne de Panela
Ativo
Bovino

Charuto
Ativo
Guarnição

Copa Lombo Acebolado
Ativo
Suínos

Copa Lombo Suína à Milanesa
Ativo
Suínos

Couve Refogada
Ativo
Guarnição

Couve-flor Empanada
Ativo
Guarnição

Coxa Sobrecoxa Assada
Ativo
Aves

Creme de Legumes
Ativo
Guarnição

Creme de Milho
Ativo
Acompanhamento

Cupim Assado Molho Alho
Ativo
Bovino

Dobradinha
Ativo
Bovino

Ervilha Fresca
Ativo
Guarnição

Escondidinho de Calabresa
Ativo
Guarnição

Escondidinho de Carne Seca
Ativo
Guarnição

Escondidinho de Frango
Ativo
Guarnição

Espaguete à Bolonhesa
Ativo
Guarnição

Farofa
Ativo
Guarnição

Farofa Temperada
Ativo
ACOMPANHAMENTOS

Feijão
Ativo
Guarnição

Feijoada
Ativo
Guarnição

Filé de Frango à Milanesa
Ativo
Aves

Filé Frango Parmegiana
Ativo
Aves

Filé Sobrecoxa Assada
Ativo
Aves

Frango Inteiro
Ativo
Aves

Frango Metade
Ativo
Aves

Frango Xadrez
Ativo
Aves

Geleia de Pimenta
Ativo
Acompanhamento

Hot Roll
Ativo
Sushi e Japonesa

Isca de Frango à Milanesa
Ativo
Aves

Isca de Frango Acebolada
Ativo
Aves

Iscas de Carne Oriental
Ativo
Bovino

Jiló Frito
Ativo
Guarnição

Joelho de Porco Assado
Ativo
Suínos

Kafta Recheada com Queijo
Ativo
Bovino

Lagarto M. Madeira
Ativo
Bovino

Lasanha à Bolonhesa
Ativo
Guarnição

Legumes
Ativo
Guarnição

Linguiça Assada
Ativo
Guarnição

Linguiça Recheada Assada
Ativo
Suínos

Linguiça Toscana Assada
Ativo
Suínos

Macarrão c/ Brócolis e Bacon
Ativo
Guarnição

Macarrão c/ Calabresa Molho Rosé
Ativo
Guarnição

Macarrão c/ Cheddar e Bacon
Ativo
Guarnição

Macarrão Caprese
Ativo
Guarnição

Macarronada à Bolonhesa
Ativo
Guarnição

Maionese de Legumes com Frango
Ativo
Saladas

Maminha Assada
Ativo
Bovino

Medalhão de Frango
Ativo
Aves

Molho de Tomate Rústico (assado)
Ativo
MOLHOS

Molho Pesto
Ativo
Acompanhamento

Molho Pimenta Artesanal
Ativo
Acompanhamento

Nhoque ao Molho Sugo
Ativo
Guarnição

Panqueca de Carne ao Pomodoro
Ativo
Guarnição

Panqueca Frango c/ Requeijão
Ativo
Guarnição

Panqueca Presunto e Mussarela
Ativo
Guarnição

Patê de Alho
Ativo
Acompanhamento

Patê de Azeitona Verde
Ativo
Acompanhamento

Patê de Nozes
Ativo
Molhos e Patês

Pernil ao Molho Ferrugem
Ativo
Suínos

Poke de Kani
Ativo
Sushi e Japonesa

Poke de Shimeji
Ativo
Sushi e Japonesa

Polenta ao Molho de Carne Moída
Ativo
Guarnição

Polpetone Recheado
Ativo
Bovino

Purê de Batata
Ativo
Acompanhamento

Purê de Cabotiá
Ativo
Guarnição

Quibe Assado
Ativo
Bovino

Refeição: Charuto
Ativo
REFEIÇÕES

Refeição: Escondidinho de Calabresa
Ativo
REFEIÇÕES

Refeição: Escondidinho de Carne Seca
Ativo
REFEIÇÕES

Refeição: Escondidinho de Frango
Ativo
REFEIÇÕES

Refeição: Filé Sobrecoxa Assada
Ativo
REFEIÇÕES

Refeição: Iscas de Frango Milanesa
Ativo
REFEIÇÕES

Refeição: Macarrão c/ Calabresa Molho Rosé
Ativo
REFEIÇÕES

Refeição: Macarronada à Bolonhesa
Ativo
REFEIÇÕES

Refeição: Medalhão de Frango
Ativo
REFEIÇÕES

Refeição: Salada Batatonese
Ativo
REFEIÇÕES

Refeição: Salada Cenoura c/ Vagem
Ativo
REFEIÇÕES

Refeição: Tirinha de Carne Chinesa
Ativo
REFEIÇÕES

Rondelli Frango Requeijão
Ativo
Guarnição

Salada Batatonese
Ativo
Saladas

Salada Caesar c/ Frango
Ativo
Saladas

Salada Cenoura c/ Vagem
Ativo
Saladas

Salada de Batata Curtinha
Ativo
Saladas

Salada de Beterraba
Ativo
Saladas

Salada Mix Folhas e Legumes c/ Proteínas
Ativo
Saladas

Salada Sunomono
Ativo
Saladas

Sobrecoxa Recheada
Ativo
Aves

Strogonoff de Carne
Ativo
Bovino

Strogonoff de Frango
Ativo
Aves

Sushi Kani c/ Cream Cheese
Ativo
Sushi e Japonesa

Tabule
Ativo
Saladas

Temaki Hot Salmão Grelhado
Ativo
Sushi e Japonesa

Tirinha de Carne Chinesa
Ativo
Bovino

Tulipa Buffalo Wings
Ativo
Aves

Yakissoba
Ativo
Guarnição
`;

async function main() {
    console.log("🛠️ POPULANDO RECEITAS EM MASSA 🛠️");

    // 1. Carregar Categorias de RECEITAS atuais
    const currentTreeSnap = await getDocs(query(collection(db, 'CategoryTree'), where("type", "==", "receitas")));
    const categoryMap = {}; // name.toLowerCase() -> id

    currentTreeSnap.docs.forEach(d => {
        categoryMap[d.data().name.toLowerCase().trim()] = d.id;
    });

    async function getOrCreateCategory(catName) {
        catName = catName.trim();
        const key = catName.toLowerCase();

        if (categoryMap[key]) {
            return categoryMap[key];
        }

        console.log(`Criando nova categoria de RECEITAS: ${catName}`);
        const newCatRef = doc(collection(db, "Category"));
        const categoryId = newCatRef.id;

        await setDoc(newCatRef, {
            name: catName,
            type: 'receitas', // IMPORTANTE
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, "CategoryTree", categoryId), {
            name: catName,
            type: 'receitas', // IMPORTANTE
            active: true,
            level: 1,
            parent_id: null,
            order: 99,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        categoryMap[key] = categoryId;
        return categoryId;
    }

    const lines = rawData.split('\n');
    let itemsProcessed = 0;

    // Processamento em blocos de 3 linhas (Pula linhas vazias até achar um nome de Receita)
    let tempName = null;
    let tempStatus = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (tempName === null) {
            tempName = line;
        } else if (tempStatus === null) {
            tempStatus = (line.toLowerCase() === 'ativo');
        } else {
            const rawCategory = line;

            const categoryId = await getOrCreateCategory(rawCategory);

            // Procurar se a Receita já existe
            const recipeSnap = await getDocs(query(collection(db, 'Recipe'), where("name", "==", tempName)));
            let recipeId = null;

            if (!recipeSnap.empty) {
                recipeId = recipeSnap.docs[0].id;
            } else {
                const newRef = doc(collection(db, "Recipe"));
                recipeId = newRef.id;
            }

            // Atualiza / Insere
            await setDoc(doc(db, 'Recipe', recipeId), {
                name: tempName,
                category_id: categoryId,
                category_name: rawCategory,
                type: 'receitas',
                active: tempStatus,
                updatedAt: serverTimestamp()
            }, { merge: true });

            itemsProcessed++;
            console.log(`   ✅ Gravado Receita: ${tempName} (Cat: ${rawCategory}) - Ativo: ${tempStatus}`);

            // Resetamos as variáveis para o próximo bloco
            tempName = null;
            tempStatus = null;
        }
    }

    console.log(`\n🎉 PROCESSO CONCLUÍDO! Total de receitas processadas: ${itemsProcessed}`);
    setTimeout(() => process.exit(0), 1000);
}

main().catch(console.error);
