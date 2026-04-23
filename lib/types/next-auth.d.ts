import { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's internal tenant ID. */
            tenantId?: string
            /** Whether the user has admin privileges. */
            isAdmin?: boolean
            /** The user's database ID or sub. */
            id?: string
            /** Partner program: partner entity ID (if the user is an approved partner). */
            partnerId?: string
            /** Partner program: the user's role within their partner entity. */
            partnerRole?: string
            /** Partner program: group IDs the partner belongs to (offer segmentation). */
            partnerGroupIds?: string[]
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        /** The user's internal tenant ID. */
        tenantId?: string
        /** Whether the user has admin privileges. */
        isAdmin?: boolean
        /** Partner program: partner entity ID. */
        partnerId?: string
        /** Partner program: role within the partner entity. */
        partnerRole?: string
        /** Partner program: group IDs (offer segmentation). */
        partnerGroupIds?: string[]
    }
}
