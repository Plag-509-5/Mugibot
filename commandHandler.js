// commandHandler.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
    const commands = new Map();
    const commandFolders = ['Aventure', 'Mugiwara', 'utilitaires'];
    const commandsBasePath = path.join(__dirname, 'commands');

    for (const folder of commandFolders) {
        const currentFolderPath = path.join(commandsBasePath, folder);
        try {
            const commandFiles = (await fs.readdir(currentFolderPath)).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(currentFolderPath, file);
                try {
                    const commandModule = await import(`file://${filePath.replace(/\\/g, '/')}`);
                    const command = commandModule.default;

                    if (command && command.name && command.execute) {
                        commands.set(command.name, command);
                        console.log(`Commande chargée: ${command.name} depuis commands/${folder}/${file}`);
                    } else {
                        console.warn(`La commande à ${filePath} est mal formée (manque name ou execute).`);
                    }
                } catch (e) {
                    console.error(`Erreur lors de l'import de la commande ${filePath}:`, e);
                }
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Dossier de commandes introuvable (sera ignoré): ${currentFolderPath}`);
            } else {
                console.error(`Erreur lors du chargement des commandes du dossier ${folder}:`, error);
            }
        }
    }
    return commands;
}

export default loadCommands;
