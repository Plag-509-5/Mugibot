// connection.js
import { Boom } from '@hapi/boom';
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import 'dotenv/config';
import fs from 'fs';

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

async function connectToWhatsApp(onConnectionEvent) {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    const sock = makeWASocket({
        logger,
        printQRInTerminal: false,
        browser: Browsers.chrome('MugiwaraBot Chrome'),
        auth: state,
        generateHighQualityLinkPreview: true,
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.BOT_PHONE_NUMBER;
        if (!phoneNumber) {
            console.error("=========================================================================");
            console.error("🛑 ALERTE CAPITAINE PLAG TECH ! 🛑");
            console.error("Pour que notre escargophone spécial (le bot) puisse prendre la mer,");
            console.error("j'ai besoin de son numéro d'identification unique (son numéro de téléphone WhatsApp) !");
            console.error("Merci de configurer la variable 'BOT_PHONE_NUMBER' dans ton fichier .env.");
            console.error("Exemple : BOT_PHONE_NUMBER=50937551427 (sans le '+')");
            console.error("Sans cela, impossible de lever l'ancre !");
            console.error("=========================================================================");
            process.exit(1);
        }
        console.log("⏳ Préparation de l'escargophone pour l'appairage...");
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log("=========================================================================");
                console.log("📱 CODE D'APPAIRAGE POUR L'ESCARGOPHONE SPÉCIAL 📱");
                console.log(`🏴‍☠️ Ton code de pairage est : >>> ${code} <<<`);
                console.log("-------------------------------------------------------------------------");
                console.log("Instructions pour l'enrôlement de l'escargophone :");
                console.log("1. Ouvre WhatsApp sur ton téléphone principal.");
                console.log("2. Va dans 'Paramètres' > 'Appareils connectés'.");
                console.log("3. Choisis 'Connecter un appareil'.");
                console.log("4. Sélectionne 'Connecter avec le numéro de téléphone à la place'.");
                console.log("5. Entre le code ci-dessus.");
                console.log("Et voilà, le MugiBot sera prêt à naviguer !");
                console.log("=========================================================================");
            } catch (error) {
                console.error("☠️ Erreur lors de la demande du code de pairage de l'escargophone :", error);
                console.log("Vérifie que le numéro de téléphone est correct et que le bot n'est pas déjà connecté ailleurs.");
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.warn(`🚫 Escargophone déconnecté ! Cause : ${lastDisconnect.error?.message || 'Inconnue'} (Code: ${statusCode})`);
            if (statusCode === DisconnectReason.loggedOut) {
                console.error("🛑 DÉCONNEXION PERMANENTE ! L'escargophone a été déconnecté de WhatsApp. Tu devras supprimer le dossier 'baileys_auth_info' et relancer l'appairage.");
                try {
                    if (fs.existsSync('./baileys_auth_info')) {
                        fs.rmSync('./baileys_auth_info', { recursive: true, force: true });
                        console.log("Dossier d'authentification 'baileys_auth_info' supprimé.");
                    }
                } catch (err) {
                    console.error("Erreur lors de la suppression du dossier d'authentification:", err);
                }
                process.exit(1);
            } else if (shouldReconnect) {
                console.log("🛠️ Tentative de reconnexion de l'escargophone...");
                connectToWhatsApp(onConnectionEvent);
            } else {
                 console.log("🛑 Reconnexion non tentée pour cette erreur spécifique. Vérifie la situation ou redémarre manuellement.");
            }
        } else if (connection === 'open') {
            console.log("=========================================================================");
            console.log("🎉🌊 L'ESCARGOPHONE EST ENFIN OPÉRATIONNEL ! 🌊🎉");
            console.log(`Connecté en tant que : ${sock.user?.name || sock.user?.id || 'Utilisateur Inconnu'}`);
            console.log("Prêt à recevoir les transmissions de tout Grand Line !");
            console.log("=========================================================================");
            if (onConnectionEvent) onConnectionEvent(sock);
        } else if (connection === 'connecting') {
            console.log("🔌 Connexion de l'escargophone en cours... Patience, le réseau de Grand Line est parfois capricieux !");
        }
    });

    return sock;
}

export default connectToWhatsApp;
