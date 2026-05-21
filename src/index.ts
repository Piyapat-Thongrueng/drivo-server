import dotenv from "dotenv"
import app from "./app"
import { startBookingCronJobs } from "./jobs/booking.job"

dotenv.config()

const PORT = process.env.PORT || 4000

startBookingCronJobs()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
