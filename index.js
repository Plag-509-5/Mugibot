// index.js
import connectToWhatsApp from './connection.js';
import loadCommands from './commandHandler.js';
import 'dotenv/config';
import { handleButtonResponse, handleDirectAnswer } from './commands/Aventure/quiz.js';
// Si tu as besoin d'accéder à activeQuizzes pour une logique spécifique dans index.js
import { activeQuizzes } from './commands/Aventure/quiz.js';

const prefix = process.env.PREFIX || '!';

async function startBot() {
    console.log("=========================================================================");
    console.log("🏴‍☠️⚓️ Embarquement immédiat sur le MugiBot ! ⚓️🏴‍☠️");
    console.log("    Développé avec passion ❤️ par le Capitaine : Plag tech");
    console.log("-------------------------------------------------------------------------");
    console.log("🔧 Vérification des cartes et du matériel (chargement des commandes)...");

    const commands = await loadCommands();
    console.log(`🗺️ ${commands.size} trésors (commandes) trouvés et chargés à bord ! Prêt à lever l'ancre !`);
    console.log("-------------------------------------------------------------------------");

    const sock = await connectToWhatsApp(async (currentSock) => {
        console.log("-------------------------------------------------------------------------");
        console.log("📞 L'escargophone principal est connecté et opérationnel !");
        console.log("Le Mugibot est prêt à recevoir vos ordres, Capitaine !");
        console.log("-------------------------------------------------------------------------");
        if (process.env.OWNER_NUMBER) {
           try {
               await currentSock.sendMessage(process.env.OWNER_NUMBER + '@s.whatsapp.net', { text: '🌊 MugiBot est en ligne et prêt pour l'aventure, Capitaine Plag tech !' });
           } catch (e) {
            console.warn("N'a pas pu envoyer le message de démarrage au propriétaire. L'escargophone est peut-être timide ?");
           }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') {
            return;
        }

        const messageType = Object.keys(msg.message)[0];

        // Gestion des réponses aux boutons du quiz
        if (messageType === 'buttonsResponseMessage' && msg.message.buttonsResponseMessage.selectedButtonId?.startsWith('quiz_')) {
            try {
                await handleButtonResponse(sock, msg);
            } catch (error) {
                console.error("🏴‍☠️ Erreur de boussole lors du traitement de la réponse au bouton de quiz:", error);
            }
            return; 
        }
        
        let body = '';
        if (messageType === 'conversation') {
            body = msg.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            body = msg.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage' && msg.message.imageMessage.caption) {
            body = msg.message.imageMessage.caption;
        } else if (messageType === 'videoMessage' && msg.message.videoMessage.caption) {
            body = msg.message.videoMessage.caption;
        }

        if (body && body.startsWith(prefix)) {
            const args = body.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = commands.get(commandName) || Array.from(commands.values()).find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (command) {
                try {
                    console.log(`⚡ Exécution de la commande: ${prefix}${commandName} par ${msg.pushName || msg.key.remoteJid}`);
                    await command.execute({ sock, msg, args, commands, prefix });
                } catch (error) {
                    console.error(`❌ Erreur lors de l'exécution de ${prefix}${commandName}:`, error);
                    await sock.sendMessage(msg.key.remoteJid, { text: '🏴‍☠️ Oh non, Luffy a encore cassé la boussole ! Une erreur est survenue à bord.' }, { quoted: msg });
                }
            }
        }
    });
}

startBot().catch(err => {
    console.error("=========================================================================");
    console.error("☠️ AVARIE MAJEURE AU DÉMARRAGE DU BOT ! Vérifiez les journaux ! ☠️", err);
    console.error("=========================================================================");
    console.log("Le navire a rencontré une tempête inattendue... Reprise des opérations impossible pour le moment.");
});
