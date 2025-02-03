import cron from "node-cron";
import { reportService } from "../services/reportService.js";

export const dailyJob = async () => {
    cron.schedule("* * * * *", async () => {
      console.log("Startar sammanslagningsjobbet (varje minut)...");
      try {
        // await mergeData(); // Kör mergeData-funktionen
        await reportService();
  
        console.log("Sammanslagningsjobb slutfört.");
      } catch (error) {
        console.error("Fel under sammanslagningsjobbet:", error.message);
      }
    });
  
    console.log("Cron-jobbet är startat och körs varje minut.");
  };