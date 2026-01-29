// Debug script para verificar localStorage e encontrar a fonte dos categoryGroups
// Este script precisa ser executado no browser console

console.log('=== DEBUG LOCAL STORAGE ===\n');

const menuConfig = localStorage.getItem('menuConfig');
if (menuConfig) {
    try {
        const parsed = JSON.parse(menuConfig);
        console.log('menuConfig encontrado no localStorage:');
        console.log('Keys:', Object.keys(parsed));

        if (parsed.category_groups) {
            console.log('\n=== CATEGORY_GROUPS ===');
            parsed.category_groups.forEach((group, index) => {
                console.log(`\nGrupo ${index + 1}:`);
                console.log('  ID:', group.id);
                console.log('  Nome:', group.name);
                console.log('  Items:', group.items);
                console.log('  Total de items:', group.items?.length || 0);
            });
        } else {
            console.log('category_groups não encontrado no localStorage');
        }

        console.log('\n=== FULL CONFIG ===');
        console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
        console.error('Erro ao parsear menuConfig:', e);
    }
} else {
    console.log('menuConfig NÃO encontrado no localStorage');
}

// Para limpar o localStorage e forçar reload do banco:
// localStorage.removeItem('menuConfig');
// location.reload();
