export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      AIMemory: {
        Row: {
          communityId: string
          createdAt: string
          expiresAt: string | null
          id: string
          key: string
          relevance: number
          type: Database["public"]["Enums"]["AIMemoryType"]
          updatedAt: string
          value: Json
        }
        Insert: {
          communityId: string
          createdAt?: string
          expiresAt?: string | null
          id: string
          key: string
          relevance?: number
          type: Database["public"]["Enums"]["AIMemoryType"]
          updatedAt: string
          value: Json
        }
        Update: {
          communityId?: string
          createdAt?: string
          expiresAt?: string | null
          id?: string
          key?: string
          relevance?: number
          type?: Database["public"]["Enums"]["AIMemoryType"]
          updatedAt?: string
          value?: Json
        }
      }
      AuditLog: {
        Row: {
          action: string
          communityId: string | null
          createdAt: string
          id: string
          ipAddress: string | null
          newData: Json | null
          oldData: Json | null
          resource: string
          resourceId: string | null
          userAgent: string | null
          userId: string | null
        }
        Insert: {
          action: string
          communityId?: string | null
          createdAt?: string
          id: string
          ipAddress?: string | null
          newData?: Json | null
          oldData?: Json | null
          resource: string
          resourceId?: string | null
          userAgent?: string | null
          userId?: string | null
        }
        Update: {
          action?: string
          communityId?: string | null
          createdAt?: string
          id?: string
          ipAddress?: string | null
          newData?: Json | null
          oldData?: Json | null
          resource?: string
          resourceId?: string | null
          userAgent?: string | null
          userId?: string | null
        }
      }
      Automation: {
        Row: {
          actions: Json
          communityId: string
          createdAt: string
          description: string | null
          eventId: string | null
          id: string
          isActive: boolean
          lastRunAt: string | null
          name: string
          nextRunAt: string | null
          status: Database["public"]["Enums"]["AutomationStatus"]
          trigger: Database["public"]["Enums"]["AutomationTrigger"]
          triggerConfig: Json
          updatedAt: string
        }
        Insert: {
          actions: Json
          communityId: string
          createdAt?: string
          description?: string | null
          eventId?: string | null
          id: string
          isActive?: boolean
          lastRunAt?: string | null
          name: string
          nextRunAt?: string | null
          status?: Database["public"]["Enums"]["AutomationStatus"]
          trigger: Database["public"]["Enums"]["AutomationTrigger"]
          triggerConfig: Json
          updatedAt: string
        }
        Update: {
          actions?: Json
          communityId?: string
          createdAt?: string
          description?: string | null
          eventId?: string | null
          id?: string
          isActive?: boolean
          lastRunAt?: string | null
          name?: string
          nextRunAt?: string | null
          status?: Database["public"]["Enums"]["AutomationStatus"]
          trigger?: Database["public"]["Enums"]["AutomationTrigger"]
          triggerConfig?: Json
          updatedAt?: string
        }
      }
      AutomationRun: {
        Row: {
          automationId: string
          completedAt: string | null
          error: string | null
          id: string
          logsCount: number
          result: Json | null
          startedAt: string
          status: Database["public"]["Enums"]["AutomationRunStatus"]
        }
        Insert: {
          automationId: string
          completedAt?: string | null
          error?: string | null
          id: string
          logsCount?: number
          result?: Json | null
          startedAt?: string
          status?: Database["public"]["Enums"]["AutomationRunStatus"]
        }
        Update: {
          automationId?: string
          completedAt?: string | null
          error?: string | null
          id?: string
          logsCount?: number
          result?: Json | null
          startedAt?: string
          status?: Database["public"]["Enums"]["AutomationRunStatus"]
        }
      }
      Channel: {
        Row: {
          accessToken: string | null
          communityId: string
          createdAt: string
          handle: string | null
          id: string
          isActive: boolean
          isConnected: boolean
          lastSyncAt: string | null
          name: string
          pageId: string | null
          refreshToken: string | null
          settings: Json | null
          tokenExpiresAt: string | null
          type: Database["public"]["Enums"]["ChannelType"]
          updatedAt: string
        }
        Insert: {
          accessToken?: string | null
          communityId: string
          createdAt?: string
          handle?: string | null
          id: string
          isActive?: boolean
          isConnected?: boolean
          lastSyncAt?: string | null
          name: string
          pageId?: string | null
          refreshToken?: string | null
          settings?: Json | null
          tokenExpiresAt?: string | null
          type: Database["public"]["Enums"]["ChannelType"]
          updatedAt: string
        }
        Update: {
          accessToken?: string | null
          communityId?: string
          createdAt?: string
          handle?: string | null
          id?: string
          isActive?: boolean
          isConnected?: boolean
          lastSyncAt?: string | null
          name?: string
          pageId?: string | null
          refreshToken?: string | null
          settings?: Json | null
          tokenExpiresAt?: string | null
          type?: Database["public"]["Enums"]["ChannelType"]
          updatedAt?: string
        }
      }
      ChannelAdaptation: {
        Row: {
          body: string
          channelType: Database["public"]["Enums"]["ChannelType"]
          createdAt: string
          cta: string | null
          draftId: string
          hashtags: string[] | null
          id: string
          imageUrl: string | null
          metadata: Json | null
          updatedAt: string
        }
        Insert: {
          body: string
          channelType: Database["public"]["Enums"]["ChannelType"]
          createdAt?: string
          cta?: string | null
          draftId: string
          hashtags?: string[] | null
          id: string
          imageUrl?: string | null
          metadata?: Json | null
          updatedAt: string
        }
        Update: {
          body?: string
          channelType?: Database["public"]["Enums"]["ChannelType"]
          createdAt?: string
          cta?: string | null
          draftId?: string
          hashtags?: string[] | null
          id?: string
          imageUrl?: string | null
          metadata?: Json | null
          updatedAt?: string
        }
      }
      Community: {
        Row: {
          address: string | null
          city: string | null
          communityType: Database["public"]["Enums"]["CommunityType"]
          country: string
          coverUrl: string | null
          createdAt: string
          description: string | null
          editorialRules: string | null
          email: string | null
          hashtags: string[] | null
          id: string
          language: string
          logoUrl: string | null
          mentions: string[] | null
          name: string
          onboardingDone: boolean
          onboardingStep: number
          phone: string | null
          plan: Database["public"]["Enums"]["SubscriptionPlan"]
          planExpiresAt: string | null
          postalCode: string | null
          religiousStream: string | null
          signature: string | null
          slug: string
          stripeCustomerId: string | null
          timezone: string
          tone: Database["public"]["Enums"]["CommunityTone"]
          updatedAt: string
          vocabulary: Json | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          communityType?: Database["public"]["Enums"]["CommunityType"]
          country?: string
          coverUrl?: string | null
          createdAt?: string
          description?: string | null
          editorialRules?: string | null
          email?: string | null
          hashtags?: string[] | null
          id: string
          language?: string
          logoUrl?: string | null
          mentions?: string[] | null
          name: string
          onboardingDone?: boolean
          onboardingStep?: number
          phone?: string | null
          plan?: Database["public"]["Enums"]["SubscriptionPlan"]
          planExpiresAt?: string | null
          postalCode?: string | null
          religiousStream?: string | null
          signature?: string | null
          slug: string
          stripeCustomerId?: string | null
          timezone?: string
          tone?: Database["public"]["Enums"]["CommunityTone"]
          updatedAt: string
          vocabulary?: Json | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          communityType?: Database["public"]["Enums"]["CommunityType"]
          country?: string
          coverUrl?: string | null
          createdAt?: string
          description?: string | null
          editorialRules?: string | null
          email?: string | null
          hashtags?: string[] | null
          id?: string
          language?: string
          logoUrl?: string | null
          mentions?: string[] | null
          name?: string
          onboardingDone?: boolean
          onboardingStep?: number
          phone?: string | null
          plan?: Database["public"]["Enums"]["SubscriptionPlan"]
          planExpiresAt?: string | null
          postalCode?: string | null
          religiousStream?: string | null
          signature?: string | null
          slug?: string
          stripeCustomerId?: string | null
          timezone?: string
          tone?: Database["public"]["Enums"]["CommunityTone"]
          updatedAt?: string
          vocabulary?: Json | null
          website?: string | null
        }
      }
      ContentDraft: {
        Row: {
          aiGenerated: boolean
          aiModel: string | null
          aiPromptUsed: string | null
          body: string
          bodyEnglish: string | null
          bodyHebrew: string | null
          communityId: string
          contentType: Database["public"]["Enums"]["ContentType"]
          createdAt: string
          cta: string | null
          eventId: string | null
          hashtags: string[] | null
          id: string
          imagePrompt: string | null
          imageUrl: string | null
          parentDraftId: string | null
          publishedAt: string | null
          scheduledAt: string | null
          status: Database["public"]["Enums"]["ContentStatus"]
          title: string | null
          updatedAt: string
          version: number
        }
        Insert: {
          aiGenerated?: boolean
          aiModel?: string | null
          aiPromptUsed?: string | null
          body: string
          bodyEnglish?: string | null
          bodyHebrew?: string | null
          communityId: string
          contentType?: Database["public"]["Enums"]["ContentType"]
          createdAt?: string
          cta?: string | null
          eventId?: string | null
          hashtags?: string[] | null
          id: string
          imagePrompt?: string | null
          imageUrl?: string | null
          parentDraftId?: string | null
          publishedAt?: string | null
          scheduledAt?: string | null
          status?: Database["public"]["Enums"]["ContentStatus"]
          title?: string | null
          updatedAt: string
          version?: number
        }
        Update: {
          aiGenerated?: boolean
          aiModel?: string | null
          aiPromptUsed?: string | null
          body?: string
          bodyEnglish?: string | null
          bodyHebrew?: string | null
          communityId?: string
          contentType?: Database["public"]["Enums"]["ContentType"]
          createdAt?: string
          cta?: string | null
          eventId?: string | null
          hashtags?: string[] | null
          id?: string
          imagePrompt?: string | null
          imageUrl?: string | null
          parentDraftId?: string | null
          publishedAt?: string | null
          scheduledAt?: string | null
          status?: Database["public"]["Enums"]["ContentStatus"]
          title?: string | null
          updatedAt?: string
          version?: number
        }
      }
      Conversation: {
        Row: {
          communityId: string
          createdAt: string
          id: string
          title: string
          updatedAt: string
          userId: string
        }
        Insert: {
          communityId: string
          createdAt?: string
          id: string
          title?: string
          updatedAt: string
          userId: string
        }
        Update: {
          communityId?: string
          createdAt?: string
          id?: string
          title?: string
          updatedAt?: string
          userId?: string
        }
      }
      ConversationMessage: {
        Row: {
          content: string
          conversationId: string
          createdAt: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversationId: string
          createdAt?: string
          id: string
          role: string
        }
        Update: {
          content?: string
          conversationId?: string
          createdAt?: string
          id?: string
          role?: string
        }
      }
      Event: {
        Row: {
          address: string | null
          audience: string | null
          category: Database["public"]["Enums"]["EventCategory"]
          communityId: string
          coverImageUrl: string | null
          createdAt: string
          description: string | null
          endDate: string | null
          id: string
          isPublic: boolean
          isRecurring: boolean
          location: string | null
          maxAttendees: number | null
          notes: string | null
          parentEventId: string | null
          recurrenceRule: Json | null
          registrationUrl: string | null
          startDate: string
          status: Database["public"]["Enums"]["EventStatus"]
          title: string
          updatedAt: string
        }
        Insert: {
          address?: string | null
          audience?: string | null
          category?: Database["public"]["Enums"]["EventCategory"]
          communityId: string
          coverImageUrl?: string | null
          createdAt?: string
          description?: string | null
          endDate?: string | null
          id: string
          isPublic?: boolean
          isRecurring?: boolean
          location?: string | null
          maxAttendees?: number | null
          notes?: string | null
          parentEventId?: string | null
          recurrenceRule?: Json | null
          registrationUrl?: string | null
          startDate: string
          status?: Database["public"]["Enums"]["EventStatus"]
          title: string
          updatedAt: string
        }
        Update: {
          address?: string | null
          audience?: string | null
          category?: Database["public"]["Enums"]["EventCategory"]
          communityId?: string
          coverImageUrl?: string | null
          createdAt?: string
          description?: string | null
          endDate?: string | null
          id?: string
          isPublic?: boolean
          isRecurring?: boolean
          location?: string | null
          maxAttendees?: number | null
          notes?: string | null
          parentEventId?: string | null
          recurrenceRule?: Json | null
          registrationUrl?: string | null
          startDate?: string
          status?: Database["public"]["Enums"]["EventStatus"]
          title?: string
          updatedAt?: string
        }
      }
      MediaFile: {
        Row: {
          altText: string | null
          communityId: string
          createdAt: string
          duration: number | null
          eventId: string | null
          height: number | null
          id: string
          mimeType: string
          name: string
          originalName: string
          publicId: string
          size: number
          tags: string[] | null
          type: Database["public"]["Enums"]["MediaType"]
          updatedAt: string
          url: string
          usageCount: number
          width: number | null
        }
        Insert: {
          altText?: string | null
          communityId: string
          createdAt?: string
          duration?: number | null
          eventId?: string | null
          height?: number | null
          id: string
          mimeType: string
          name: string
          originalName: string
          publicId: string
          size: number
          tags?: string[] | null
          type: Database["public"]["Enums"]["MediaType"]
          updatedAt: string
          url: string
          usageCount?: number
          width?: number | null
        }
        Update: {
          altText?: string | null
          communityId?: string
          createdAt?: string
          duration?: number | null
          eventId?: string | null
          height?: number | null
          id?: string
          mimeType?: string
          name?: string
          originalName?: string
          publicId?: string
          size?: number
          tags?: string[] | null
          type?: Database["public"]["Enums"]["MediaType"]
          updatedAt?: string
          url?: string
          usageCount?: number
          width?: number | null
        }
      }
      Notification: {
        Row: {
          body: string
          communityId: string | null
          createdAt: string
          data: Json | null
          id: string
          isRead: boolean
          link: string | null
          readAt: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string | null
        }
        Insert: {
          body: string
          communityId?: string | null
          createdAt?: string
          data?: Json | null
          id: string
          isRead?: boolean
          link?: string | null
          readAt?: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId?: string | null
        }
        Update: {
          body?: string
          communityId?: string | null
          createdAt?: string
          data?: Json | null
          id?: string
          isRead?: boolean
          link?: string | null
          readAt?: string | null
          title?: string
          type?: Database["public"]["Enums"]["NotificationType"]
          userId?: string | null
        }
      }
      profiles: {
        Row: {
          avatarUrl: string | null
          communityId: string | null
          createdAt: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["UserRole"]
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          communityId?: string | null
          createdAt?: string
          email: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          updatedAt: string
        }
        Update: {
          avatarUrl?: string | null
          communityId?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          updatedAt?: string
        }
      }
      Publication: {
        Row: {
          channelId: string
          channelType: Database["public"]["Enums"]["ChannelType"]
          communityId: string
          content: string
          createdAt: string
          draftId: string | null
          error: string | null
          eventId: string | null
          externalId: string | null
          externalUrl: string | null
          fallbackType: Database["public"]["Enums"]["FallbackType"] | null
          fallbackUsed: boolean
          id: string
          mediaUrls: string[] | null
          metadata: Json | null
          publishedAt: string | null
          retryCount: number
          scheduledAt: string | null
          status: Database["public"]["Enums"]["PublicationStatus"]
          updatedAt: string
        }
        Insert: {
          channelId: string
          channelType: Database["public"]["Enums"]["ChannelType"]
          communityId: string
          content: string
          createdAt?: string
          draftId?: string | null
          error?: string | null
          eventId?: string | null
          externalId?: string | null
          externalUrl?: string | null
          fallbackType?: Database["public"]["Enums"]["FallbackType"] | null
          fallbackUsed?: boolean
          id: string
          mediaUrls?: string[] | null
          metadata?: Json | null
          publishedAt?: string | null
          retryCount?: number
          scheduledAt?: string | null
          status?: Database["public"]["Enums"]["PublicationStatus"]
          updatedAt: string
        }
        Update: {
          channelId?: string
          channelType?: Database["public"]["Enums"]["ChannelType"]
          communityId?: string
          content?: string
          createdAt?: string
          draftId?: string | null
          error?: string | null
          eventId?: string | null
          externalId?: string | null
          externalUrl?: string | null
          fallbackType?: Database["public"]["Enums"]["FallbackType"] | null
          fallbackUsed?: boolean
          id?: string
          mediaUrls?: string[] | null
          metadata?: Json | null
          publishedAt?: string | null
          retryCount?: number
          scheduledAt?: string | null
          status?: Database["public"]["Enums"]["PublicationStatus"]
          updatedAt?: string
        }
      }
      RecurringContent: {
        Row: {
          bodyTemplate: string
          channelTypes: Database["public"]["Enums"]["ChannelType"][] | null
          createdAt: string
          generatedAt: string | null
          id: string
          isActive: boolean
          metadata: Json | null
          scheduledAt: string | null
          title: string
          type: Database["public"]["Enums"]["RecurringContentType"]
          updatedAt: string
        }
        Insert: {
          bodyTemplate: string
          channelTypes?: Database["public"]["Enums"]["ChannelType"][] | null
          createdAt?: string
          generatedAt?: string | null
          id: string
          isActive?: boolean
          metadata?: Json | null
          scheduledAt?: string | null
          title: string
          type: Database["public"]["Enums"]["RecurringContentType"]
          updatedAt: string
        }
        Update: {
          bodyTemplate?: string
          channelTypes?: Database["public"]["Enums"]["ChannelType"][] | null
          createdAt?: string
          generatedAt?: string | null
          id?: string
          isActive?: boolean
          metadata?: Json | null
          scheduledAt?: string | null
          title?: string
          type?: Database["public"]["Enums"]["RecurringContentType"]
          updatedAt?: string
        }
      }
      Subscription: {
        Row: {
          cancelAtPeriodEnd: boolean
          canceledAt: string | null
          communityId: string
          createdAt: string
          currentPeriodEnd: string
          currentPeriodStart: string
          id: string
          plan: Database["public"]["Enums"]["SubscriptionPlan"]
          status: Database["public"]["Enums"]["SubscriptionStatus"]
          stripePriceId: string
          stripeSubscriptionId: string
          trialEnd: string | null
          trialStart: string | null
          updatedAt: string
        }
        Insert: {
          cancelAtPeriodEnd?: boolean
          canceledAt?: string | null
          communityId: string
          createdAt?: string
          currentPeriodEnd: string
          currentPeriodStart: string
          id: string
          plan: Database["public"]["Enums"]["SubscriptionPlan"]
          status: Database["public"]["Enums"]["SubscriptionStatus"]
          stripePriceId: string
          stripeSubscriptionId: string
          trialEnd?: string | null
          trialStart?: string | null
          updatedAt: string
        }
        Update: {
          cancelAtPeriodEnd?: boolean
          canceledAt?: string | null
          communityId?: string
          createdAt?: string
          currentPeriodEnd?: string
          currentPeriodStart?: string
          id?: string
          plan?: Database["public"]["Enums"]["SubscriptionPlan"]
          status?: Database["public"]["Enums"]["SubscriptionStatus"]
          stripePriceId?: string
          stripeSubscriptionId?: string
          trialEnd?: string | null
          trialStart?: string | null
          updatedAt?: string
        }
      }
      Template: {
        Row: {
          category: Database["public"]["Enums"]["TemplateCategory"]
          channelType: Database["public"]["Enums"]["ChannelType"] | null
          communityId: string | null
          createdAt: string
          description: string | null
          design: Json
          id: string
          isActive: boolean
          isGlobal: boolean
          isPremium: boolean
          name: string
          previewUrl: string | null
          subCategory: string | null
          tags: string[] | null
          thumbnailUrl: string | null
          updatedAt: string
          usageCount: number
        }
        Insert: {
          category: Database["public"]["Enums"]["TemplateCategory"]
          channelType?: Database["public"]["Enums"]["ChannelType"] | null
          communityId?: string | null
          createdAt?: string
          description?: string | null
          design: Json
          id: string
          isActive?: boolean
          isGlobal?: boolean
          isPremium?: boolean
          name: string
          previewUrl?: string | null
          subCategory?: string | null
          tags?: string[] | null
          thumbnailUrl?: string | null
          updatedAt: string
          usageCount?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["TemplateCategory"]
          channelType?: Database["public"]["Enums"]["ChannelType"] | null
          communityId?: string | null
          createdAt?: string
          description?: string | null
          design?: Json
          id?: string
          isActive?: boolean
          isGlobal?: boolean
          isPremium?: boolean
          name?: string
          previewUrl?: string | null
          subCategory?: string | null
          tags?: string[] | null
          thumbnailUrl?: string | null
          updatedAt?: string
          usageCount?: number
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      AIMemoryType: "EDITORIAL_PREFERENCE" | "EVENT_PATTERN" | "CONTENT_STYLE" | "CHANNEL_PREFERENCE" | "VOCABULARY" | "RECURRING_CONTENT" | "USER_FEEDBACK"
      AutomationRunStatus: "RUNNING" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "SKIPPED"
      AutomationStatus: "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED" | "DRAFT"
      AutomationTrigger: "BEFORE_EVENT" | "EVENT_DAY" | "AFTER_EVENT" | "WEEKLY_SHABBAT" | "JEWISH_HOLIDAY" | "DAILY" | "CUSTOM_SCHEDULE" | "MANUAL"
      ChannelType: "INSTAGRAM" | "FACEBOOK" | "WHATSAPP" | "TELEGRAM" | "EMAIL" | "WEB"
      CommunityTone: "MODERN" | "TRADITIONAL" | "FORMAL" | "FRIENDLY" | "RELIGIOUS"
      CommunityType: "SYNAGOGUE" | "ASSOCIATION" | "SCHOOL" | "CENTER" | "OTHER"
      ContentStatus: "DRAFT" | "AI_PROPOSAL" | "READY_TO_PUBLISH" | "PENDING_VALIDATION" | "APPROVED" | "PUBLISHED" | "ARCHIVED"
      ContentType: "EVENT_ANNOUNCEMENT" | "EVENT_REMINDER" | "EVENT_DAY" | "EVENT_RECAP" | "SHABBAT_TIMES" | "HOLIDAY_GREETING" | "DAILY_CONTENT" | "COURSE_ANNOUNCEMENT" | "COMMUNITY_NEWS" | "FUNDRAISING" | "GENERAL" | "EVENT_POST"
      EventCategory: "SHABBAT" | "HOLIDAY" | "COURSE" | "PRAYER" | "COMMUNITY" | "YOUTH" | "CULTURAL" | "FUNDRAISING" | "ANNOUNCEMENT" | "OTHER"
      EventStatus: "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED" | "COMPLETED" | "ARCHIVED"
      FallbackType: "COPY_PASTE" | "EXPORT_IMAGE" | "OPEN_PLATFORM" | "EMAIL_DRAFT"
      MediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO"
      NotificationType: "PUBLICATION_SUCCESS" | "PUBLICATION_FAILED" | "PUBLICATION_SCHEDULED" | "AUTOMATION_TRIGGERED" | "AUTOMATION_FAILED" | "AI_CONTENT_READY" | "EVENT_REMINDER" | "SUBSCRIPTION_EXPIRING" | "SUBSCRIPTION_RENEWED" | "PAYMENT_FAILED" | "CHANNEL_DISCONNECTED" | "SYSTEM"
      PublicationStatus: "PENDING" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "CANCELLED" | "FALLBACK_READY"
      RecurringContentType: "SHABBAT_TIMES" | "HOLIDAY_ANNOUNCEMENT" | "DAILY_THOUGHT" | "WEEKLY_PARASHA" | "COURSE_REMINDER"
      SubscriptionPlan: "FREE_TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"
      SubscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE" | "PAUSED"
      TemplateCategory: "SHABBAT" | "HOLIDAY" | "EVENT" | "COURSE" | "ANNOUNCEMENT" | "RECAP" | "GREETING" | "GENERAL"
      UserRole: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
