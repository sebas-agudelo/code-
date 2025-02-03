import { dbConnection } from "../config/db.js";

export const reportService = async () => {
  try {
    const pool = await dbConnection();

    // Hämta deltagar-data
    const [participantRows] = await pool.query(`
            SELECT v.campaign_id, v.view_r, p.name, p.location, p.amount, p.email, p.telephone, p.coupon_sent, p.status, p.custom_text4
            FROM view v
            LEFT JOIN participant p ON v.campaign_id = p.campaign_id 
            WHERE v.created >= NOW() - INTERVAL 1 DAY
        `);

    console.log("Participant Rows:", participantRows);

    if (participantRows.length === 0) {
      console.log("No new data to insert.");
      return;
    }

    const mergeData = {};

    participantRows.forEach((row) => {
      const key = `${row.campaign_id}-${row.view_r}`;

      if (!mergeData[key]) {
        mergeData[key] = {
          campaign_id: row.campaign_id,
          link: row.view_r,
          views: null,
          leads: null,
          paid_leads: null,
          giftcards_sent: null,
          money_received: null,
          unique_leads: new Set(),
          recuring_leads: new Set()
        };
      }

      if (row.view_r === row.location) {
        mergeData[key].views = (mergeData[key].views || 0) + 1;
      }

      if (row.telephone || row.email || row.name) {
        mergeData[key].leads = (mergeData[key].leads || 0) + 1;
      }

      if (row.status === "PAID") {
        mergeData[key].paid_leads = (mergeData[key].paid_leads || 0) + 1;
      }

     if (row.coupon_sent === 1) {
        mergeData[key].giftcards_sent =
          (mergeData[key].giftcards_sent || 0) + 1;
      }

      if (row.amount && row.status === "PAID") {
        mergeData[key].money_received =
          (mergeData[key].money_received || 0) + Number(row.amount);
      }

      if (row.status === "PAID" && row.telephone) {
        mergeData[key].unique_leads.add(row.telephone); 
      }

      if(row.custom_text4 = "ACTIVE" && row.telephone){
        mergeData[key].recuring_leads.add(row.telephone); 
      }
    });

    const data = Object.values(mergeData);

    //Samlar all data och loppar igenom det, sedan skickar jag hela listan för en insert istället för 1 och 1
    const allData = data.map((data) => {
      return [
        data.campaign_id,
        data.link,
        data.views,
        data.leads,
        data.paid_leads,
        data.giftcards_sent,
        data.money_received,
        data.unique_leads.size,
        data.recuring_leads.size
      ];
    });

    try {
      await pool.query(
        `
        INSERT INTO dashboard_report (campaign_id, link, views, leads, paid_leads, giftcards_sent, money_received, unique_leads, recuring_leads) 
        VALUES ?
        `,
        [allData]
      );

    } catch (error) {
      console.error(
        `Error inserting data for Campaign ID ${allData.campaign_id}:`,
        error
      );
    }
  } catch (error) {
    console.error("Error during database operation:", error);
  }
};
