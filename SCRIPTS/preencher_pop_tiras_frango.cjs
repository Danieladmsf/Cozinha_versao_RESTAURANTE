const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../cozinha-afeto-2026-firebase-adminsdk-fbsvc-41985dc804.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// POP: TIRAS DE FRANGO - Seguindo padrão da skill pop_creation
const popTirasFrango = {
    nome: "TIRAS DE FRANGO",
    codigo: "COR0002",
    descricao: "Técnica de corte para obtenção de tiras uniformes de frango, ideais para strogonoff, salteados e grelhados rápidos.",

    especificacoes: `
<p><strong>Tipo de Corte:</strong> Tiras longitudinais, perpendiculares às fibras</p>
<p><strong>Dimensões Padrão:</strong> 5-7 cm (comprimento) × 1-1,5 cm (largura)</p>
<p><strong>Matéria-Prima:</strong> Peito ou filé de frango sem osso e sem pele</p>
<p><strong>Temperatura Ideal:</strong> 0°C a 4°C (carne refrigerada, mais firme para cortar)</p>
<p><strong>Rendimento:</strong> Aprox. 95% do peso bruto</p>
    `.trim(),

    materiais: `
<p><strong>[EPI001]</strong> Luva de Malha de Aço — <strong>OBRIGATÓRIO</strong> na mão que segura a carne</p>
<p><strong>[EPI002]</strong> Avental Impermeável — PVC ou descartável</p>
<p><strong>[EPI003]</strong> Touca Descartável — cobrindo todo o cabelo</p>
<p><strong>[EPI004]</strong> Calçado Antiderrapante — bota de borracha ou sapato fechado</p>
    `.trim(),

    manutencao: `
<p><strong>[FER001]</strong> Faca de Desossa — lâmina curva, 15-18cm</p>
<p><strong>[FER002]</strong> Tábua de Corte Vermelha — exclusiva para carnes cruas</p>
<p><strong>[FER003]</strong> Chaira — para manter o fio da faca</p>
<p><strong>Higienização após uso:</strong></p>
<p>1. Lavar tábua e faca com água quente e detergente neutro</p>
<p>2. Enxaguar abundantemente</p>
<p>3. Sanitizar com solução clorada 200ppm por 2 min</p>
<p>4. Deixar secar naturalmente</p>
    `.trim(),

    precaucoes: `
<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Manter a carne refrigerada até o momento do corte</p>
<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Sempre cortar em direção oposta ao corpo</p>
<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Usar luva de malha de aço na mão de apoio</p>
<p><strong>[ATENÇÃO]</strong> Manter a faca sempre afiada — facas cegas causam mais acidentes</p>
<p><strong>[ATENÇÃO]</strong> Não deixar a carne fora da refrigeração por mais de 30 minutos</p>
<p>Descartar imediatamente se houver odor ou coloração anormal</p>
    `.trim(),

    passos: [
        {
            description: "<p><strong>Preparar a estação de trabalho:</strong></p><p>Higienizar tábua, faca e superfície. Colocar recipiente para produto final e outro para aparas.</p>",
            imageUrl: ""
        },
        {
            description: "<p><strong>Verificar a carne:</strong></p><p>Confirmar temperatura adequada (0-4°C), ausência de odor e coloração rosa uniforme.</p>",
            imageUrl: ""
        },
        {
            description: "<p><strong>Posicionar o filé:</strong></p><p>Colocar o peito de frango com a parte mais larga voltada para você.</p>",
            imageUrl: ""
        },
        {
            description: "<p><strong>Remover gorduras:</strong></p><p>Retirar excesso de gordura e membranas brancas com a ponta da faca.</p>",
            imageUrl: ""
        },
        {
            description: "<p><strong>Cortar em tiras:</strong></p><p>Fazer cortes perpendiculares às fibras, com espessura de 1-1,5cm.</p>",
            imageUrl: ""
        },
        {
            description: "<p><strong>Padronizar comprimento:</strong></p><p>Cortar as tiras no comprimento desejado (5-7cm).</p>",
            imageUrl: ""
        },
        {
            description: "<p><strong>Armazenar:</strong></p><p>Transferir para recipiente higienizado, cobrir com filme plástico e refrigerar imediatamente.</p>",
            imageUrl: ""
        }
    ],

    // Metadados
    categoriaId: "cortes_de_insumos",
    updatedAt: new Date(),
};

async function preencherPOP() {
    console.log("🔄 Buscando POP 'TIRAS DE FRANGO' para preencher...\n");

    // Buscar em diferentes coleções possíveis
    const colecoes = ['cortes_de_insumos', 'ferramentas', 'pops'];

    for (const colecao of colecoes) {
        try {
            const snapshot = await db.collection(colecao)
                .where('codigo', '==', 'COR0002')
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                console.log(`✅ Encontrado na coleção '${colecao}': ${doc.id}`);

                // Atualizar documento existente
                await db.collection(colecao).doc(doc.id).update({
                    ...popTirasFrango,
                    updatedAt: new Date()
                });

                console.log("✅ POP atualizado com sucesso!");
                console.log("\nCampos preenchidos:");
                console.log("  - especificacoes (Dados Técnicos)");
                console.log("  - materiais (EPIs Necessários)");
                console.log("  - manutencao (Ferramentas)");
                console.log("  - precaucoes (Precauções de Segurança)");
                console.log("  - passos (7 passos do procedimento)");
                return;
            }
        } catch (error) {
            console.log(`⚠️ Erro na coleção '${colecao}': ${error.message}`);
        }
    }

    // Se não encontrou, tentar buscar por nome
    console.log("🔍 Buscando por nome 'TIRAS DE FRANGO'...");

    for (const colecao of colecoes) {
        try {
            const snapshot = await db.collection(colecao)
                .where('nome', '==', 'TIRAS DE FRANGO')
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                console.log(`✅ Encontrado na coleção '${colecao}': ${doc.id}`);

                await db.collection(colecao).doc(doc.id).update({
                    ...popTirasFrango,
                    updatedAt: new Date()
                });

                console.log("✅ POP atualizado com sucesso!");
                return;
            }
        } catch (error) {
            console.log(`⚠️ Erro: ${error.message}`);
        }
    }

    console.log("❌ POP não encontrado. Verifique se existe no banco de dados.");
}

preencherPOP()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Erro:", error);
        process.exit(1);
    });
