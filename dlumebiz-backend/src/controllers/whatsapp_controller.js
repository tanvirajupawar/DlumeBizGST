

const whatsappController = {



    webhook: async function (req, res) {
        try {
            const VERIFY_TOKEN = "Justme159357verify";

            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challenge = req.query["hub.challenge"];

            if (mode === "subscribe" && token === VERIFY_TOKEN) {
                 return res.status(200).send(challenge);
            } else {
                return res.sendStatus(403);
            
            }
        
        } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message || error,
        });
        }
    },

    receiveWebhook : async function (req, res)  {
        console.log("Webhook event received");

        res.sendStatus(200);
    },

 
  
};

module.exports = whatsappController;
