import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 1. Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Not logged in" })
    }

    // 2. Fetch one task that the user can see
    const { data: tasks, error: selectError } = await supabase
      .from("tasks")
      .select("*")
      .limit(1)

    let updateResult = null
    let updateError = null

    if (tasks && tasks.length > 0) {
      const testTask = tasks[0]
      // 3. Try to update this task's position/status (non-destructive test update to its current values)
      const { data: updated, error: uErr } = await supabase
        .from("tasks")
        .update({ position: testTask.position })
        .eq("id", testTask.id)
        .select()

      updateResult = updated
      updateError = uErr
    }

    const debugInfo = {
      user: {
        id: user.id,
        email: user.email
      },
      selectError: selectError ? { message: selectError.message, code: selectError.code } : null,
      tasksFound: tasks ? tasks.length : 0,
      testTask: tasks && tasks.length > 0 ? { id: tasks[0].id, title: tasks[0].title, position: tasks[0].position } : null,
      updateResult,
      updateError: updateError ? { message: updateError.message, code: updateError.code } : null
    }

    fs.writeFileSync(path.join(process.cwd(), "debug_output.json"), JSON.stringify(debugInfo, null, 2))

    return NextResponse.json({ success: true, debugInfo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
