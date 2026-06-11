import { createClient } from "@/lib/supabase/server"
import { ProfileService } from "./profile.service"
import {
  signupSchema,
  loginSchema,
  SignupInput,
  LoginInput,
} from "../schemas/auth.schema"

export class AuthService {
  static async signUp(input: SignupInput) {
    // 1. Zod Validation
    const validated = signupSchema.safeParse(input)
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((e) => e.message).join(", ")
      throw new Error(errorMsg)
    }

    const { name, email, password } = validated.data
    const supabase = await createClient()

    // 2. Supabase Auth signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    const user = data.user
    if (!user) {
      throw new Error("Failed to create user. Please try again.")
    }

    // 3. Create profile in the database
    try {
      await ProfileService.createProfile(user.id, email, name)
    } catch (profileError: any) {
      console.error(
        "Failed to create user profile, but auth user was created:",
        profileError
      )
      // If profile insertion fails due to trigger issues or other, throw it to notify the user
      throw new Error(
        "Account created but failed to initialize profile: " +
          profileError.message
      )
    }

    return { user }
  }

  static async signIn(input: LoginInput) {
    // 1. Zod Validation
    const validated = loginSchema.safeParse(input)
    if (!validated.success) {
      const errorMsg = validated.error.issues.map((e) => e.message).join(", ")
      throw new Error(errorMsg)
    }

    const { email, password } = validated.data
    const supabase = await createClient()

    // 2. Supabase Auth signin
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return { user: data.user, session: data.session }
  }

  static async signOut() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  static async getCurrentUser() {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) {
      return null
    }
    return user
  }
}
