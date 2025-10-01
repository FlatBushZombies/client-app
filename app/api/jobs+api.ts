import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`)

    const formData = await request.json()

    const { serviceType, selectedServices, startDate, endDate, maxPrice, specialistChoice, additionalInfo, documents } =
      formData

    const result = await sql`
      INSERT INTO service_request (
        service_type,
        selected_services,
        start_date,
        end_date,
        max_price,
        specialist_choice,
        additional_info,
        documents
      )
      VALUES (
        ${serviceType},
        ${JSON.stringify(selectedServices)},
        ${startDate},
        ${endDate},
        ${maxPrice},
        ${specialistChoice},
        ${additionalInfo},
        ${documents}
      )
      RETURNING *;
    `

    return new Response(JSON.stringify({ success: true, data: result[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error inserting service request:", error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
