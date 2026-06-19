"use server"

import { createClient } from "@/lib/supabase/server"

export async function getAllEmailsAction(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("profiles").select("email")
    
    if (error) {
      console.error("Error fetching emails:", error)
      return []
    }
    
    return (data?.map((profile) => profile.email).filter(Boolean) as string[]) || []
  } catch (error) {
    console.error("Error in getAllEmailsAction:", error)
    return []
  }
}
