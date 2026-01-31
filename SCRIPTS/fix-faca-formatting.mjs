// Script para padronizar formatação da Faca no banco de dados
// Execução: node SCRIPTS/fix-faca-formatting.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('.venv/cozinha-afeto-2026-firebase-adminsdk-fbsvc-ab856b85c0.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function fixFacaFormatting() {
    try {
        console.log('🔍 Buscando documento da Faca...');

        const snapshot = await db.collection('ferramentas')
            .where('nome', '==', 'Faca para Carne Curvada Larga branca')
            .get();

        if (snapshot.empty) {
            console.log('❌ Faca não encontrada');
            process.exit(1);
        }

        const docRef = snapshot.docs[0].ref;
        const data = snapshot.docs[0].data();

        console.log('📝 Atualizando formatação...');

        // Novos dados formatados no padrão dos outros POPs
        const updates = {
            materiais: `<p><strong>[EPI001]</strong> Luva de Malha de Aço — <strong>OBRIGATÓRIO</strong> na mão que segura a carne</p>
<p><strong>[EPI002]</strong> Avental de PVC — proteção contra respingos</p>
<p><strong>[EPI003]</strong> Óculos de Proteção — ao afiar a faca</p>
<p><strong>[EPI004]</strong> Calçado Antiderrapante — obrigatório em área de produção</p>`,

            manutencao: `<p><strong>[FER002]</strong> Chaira de Aço — para manutenção diária do fio</p>
<p><strong>[FER003]</strong> Pedra de Afiar 1000/3000 — afiação mensal</p>
<p><strong>Semanalmente:</strong> Afiar com chaira de aço cromado</p>
<p><strong>Mensalmente:</strong> Amolar com pedra 1000/3000</p>
<p><strong>Após cada uso:</strong> Higienizar com detergente neutro e água quente</p>
<p><strong style="color: #dc2626;">Nunca deixar de molho!</strong></p>
<p>Guardar em porta-facas magnético ou com protetor de lâmina</p>
<p>Verificar integridade do cabo trimestralmente</p>`,

            precaucoes: `<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Sempre cortar em direção oposta ao corpo</p>
<p><strong style="color: #dc2626;">[CRÍTICO]</strong> Usar luva de malha de aço na mão de apoio</p>
<p><strong>[ATENÇÃO]</strong> Manter a faca sempre afiada — facas cegas causam mais acidentes</p>
<p><strong>[ATENÇÃO]</strong> Não deixar a faca na pia ou coberta por outros utensílios</p>
<p><strong>[ATENÇÃO]</strong> Transportar sempre com a lâmina voltada para baixo</p>
<p>Nunca tentar aparar uma faca caindo — afaste-se</p>
<p>Superfície de corte deve ser estável e antiderrapante</p>`
        };

        await docRef.update(updates);

        console.log('✅ Faca atualizada com sucesso!');
        console.log('\nCampos atualizados:');
        console.log('  - materiais (EPIs)');
        console.log('  - manutencao');
        console.log('  - precaucoes');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

fixFacaFormatting();
