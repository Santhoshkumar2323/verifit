import { supabase } from "@/lib/supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


/* -------------------------------------------------------------------------- */
/* Request helper                                                             */
/* -------------------------------------------------------------------------- */

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.access_token) {
    headers.set(
      "Authorization",
      `Bearer ${session.access_token}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}`;

    try {
      const body = await response.json();

      if (typeof body?.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}


/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type UserRole =
  | "USER"
  | "PROFESSIONAL"
  | "ADMIN";

export type VerificationStatus =
  | "verified"
  | "reviewed"
  | "pending"
  | "unverified";

export type CredentialStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";


export interface ApiUser {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}


export interface ApiFactCheck {
  status: VerificationStatus;
  summary?: string | null;
  confidence?: number | null;
  model_name?: string | null;
}


export interface ApiPost {
  id: string;
  author: ApiUser;
  title: string;
  content: string;
  category?: string | null;
  image_url?: string | null;
  created_at: string;
  votes: number;
  comments: number;
  fact_check?: ApiFactCheck | null;
}


export interface PostListResponse {
  posts: ApiPost[];
  total: number;
}


export interface CreatePostPayload {
  title: string;
  content: string;
  category?: string;
  image_url?: string;
}


/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export interface ApiCommentAuthor {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  role: UserRole;
}


export interface ApiComment {
  id: string;
  post_id: string;
  author: ApiCommentAuthor;
  content: string;
  created_at: string;
  updated_at: string;
}


export interface CommentListResponse {
  comments: ApiComment[];
  total: number;
}


export interface CreateCommentPayload {
  content: string;
}


/* -------------------------------------------------------------------------- */
/* Professionals                                                              */
/* -------------------------------------------------------------------------- */

export interface ApiCredential {
  id: string;
  credential_name: string;
  credential_type?: string | null;
  issuer?: string | null;
  credential_number?: string | null;
  document_url?: string | null;
  status: CredentialStatus;
  submitted_at: string;
  verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}


export interface ApiProfessional {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
  specialization: string;
  bio?: string | null;
  experience_years: number;
  verified: boolean;
  verification_status: CredentialStatus;
  credentials: ApiCredential[];
}


export interface ProfessionalListResponse {
  professionals: ApiProfessional[];
  total: number;
}


export interface CreateProfessionalPayload {
  specialization: string;
  bio?: string;
  experience_years: number;
}


export interface ProfessionalRegistrationResponse {
  id: string;
  user_id: string;
  specialization: string;
  bio?: string | null;
  experience_years: number;
  verification_status: CredentialStatus;
  created_at: string;
  updated_at: string;
}


export interface CreateCredentialPayload {
  credential_name: string;
  credential_type?: string;
  issuer?: string;
  credential_number?: string;
  document_url?: string;
}


export interface CreateBookingPayload {
  professional_id: string;
  message?: string;
  requested_at: string;
}


export interface ApiBooking {
  id: string;
  professional_id: string;
  status: BookingStatus;
  message?: string | null;
  requested_at: string;
}


/* -------------------------------------------------------------------------- */
/* Posts                                                                      */
/* -------------------------------------------------------------------------- */

export async function getPosts(params?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PostListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.category) {
    searchParams.set(
      "category",
      params.category,
    );
  }

  if (params?.search) {
    searchParams.set(
      "search",
      params.search,
    );
  }

  if (params?.limit !== undefined) {
    searchParams.set(
      "limit",
      String(params.limit),
    );
  }

  if (params?.offset !== undefined) {
    searchParams.set(
      "offset",
      String(params.offset),
    );
  }

  const query = searchParams.toString();

  return request<PostListResponse>(
    `/posts${query ? `?${query}` : ""}`,
  );
}


export async function getPost(
  postId: string,
): Promise<ApiPost> {
  return request<ApiPost>(
    `/posts/${encodeURIComponent(postId)}`,
  );
}


/* -------------------------------------------------------------------------- */
/* Upload post image                                                          */
/* -------------------------------------------------------------------------- */

export async function uploadPostImage(
  image: File,
): Promise<{
  url: string;
}> {
  const formData = new FormData();

  formData.append(
    "image",
    image,
  );

  return request<{
    url: string;
  }>(
    "/posts/media/image",
    {
      method: "POST",
      body: formData,
    },
  );
}


/* -------------------------------------------------------------------------- */
/* Create post                                                                 */
/* -------------------------------------------------------------------------- */

export async function createPost(
  payload: CreatePostPayload,
): Promise<ApiPost> {
  return request<ApiPost>(
    "/posts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function upvotePost(
  postId: string,
): Promise<{
  post_id: string;
  votes: number;
}> {
  return request<{
    post_id: string;
    votes: number;
  }>(
    `/posts/${encodeURIComponent(postId)}/vote`,
    {
      method: "POST",
    },
  );
}

export async function deletePost(
  postId: string,
): Promise<{
  message: string;
  post_id: string;
}> {
  return request<{
    message: string;
    post_id: string;
  }>(
    `/posts/${encodeURIComponent(postId)}`,
    {
      method: "DELETE",
    },
  );
}


/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export async function getComments(
  postId: string,
  params?: {
    limit?: number;
    offset?: number;
  },
): Promise<CommentListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit !== undefined) {
    searchParams.set(
      "limit",
      String(params.limit),
    );
  }

  if (params?.offset !== undefined) {
    searchParams.set(
      "offset",
      String(params.offset),
    );
  }

  const query = searchParams.toString();

  return request<CommentListResponse>(
    `/posts/${encodeURIComponent(postId)}/comments${
      query ? `?${query}` : ""
    }`,
  );
}


export async function createComment(
  postId: string,
  payload: CreateCommentPayload,
): Promise<ApiComment> {
  return request<ApiComment>(
    `/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function deleteComment(
  commentId: string,
): Promise<{
  message: string;
  comment_id: string;
}> {
  return request<{
    message: string;
    comment_id: string;
  }>(
    `/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
    },
  );
}


/* -------------------------------------------------------------------------- */
/* Professionals                                                              */
/* -------------------------------------------------------------------------- */

export async function getProfessionals(params?: {
  specialization?: string;
  search?: string;
}): Promise<ProfessionalListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.specialization) {
    searchParams.set(
      "specialization",
      params.specialization,
    );
  }

  if (params?.search) {
    searchParams.set(
      "search",
      params.search,
    );
  }

  const query = searchParams.toString();

  return request<ProfessionalListResponse>(
    `/professionals${query ? `?${query}` : ""}`,
  );
}


export async function getProfessional(
  professionalId: string,
): Promise<ApiProfessional> {
  return request<ApiProfessional>(
    `/professionals/${encodeURIComponent(professionalId)}`,
  );
}


export async function registerProfessional(
  payload: CreateProfessionalPayload,
): Promise<ProfessionalRegistrationResponse> {
  return request<ProfessionalRegistrationResponse>(
    "/professionals/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function getMyProfessionalProfile(): Promise<ApiProfessional> {
  return request<ApiProfessional>(
    "/professionals/me/profile",
  );
}


export async function submitCredential(
  payload: CreateCredentialPayload,
): Promise<ApiCredential> {
  return request<ApiCredential>(
    "/professionals/me/credentials",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function uploadCredential(
  payload: {
    credential_name: string;
    credential_type?: string;
    issuer?: string;
    credential_number?: string;
    document: File;
  },
): Promise<ApiCredential> {
  const formData = new FormData();

  formData.append(
    "credential_name",
    payload.credential_name,
  );

  if (payload.credential_type) {
    formData.append(
      "credential_type",
      payload.credential_type,
    );
  }

  if (payload.issuer) {
    formData.append(
      "issuer",
      payload.issuer,
    );
  }

  if (payload.credential_number) {
    formData.append(
      "credential_number",
      payload.credential_number,
    );
  }

  formData.append(
    "document",
    payload.document,
  );

  return request<ApiCredential>(
    "/professionals/me/credentials/upload",
    {
      method: "POST",
      body: formData,
    },
  );
}


export async function getMyCredentials(): Promise<ApiCredential[]> {
  return request<ApiCredential[]>(
    "/professionals/me/credentials",
  );
}


export async function getCredentialDocumentUrl(
  credentialId: string,
): Promise<{
  credential_id: string;
  url: string;
  expires_in: number;
}> {
  return request<{
    credential_id: string;
    url: string;
    expires_in: number;
  }>(
    `/professionals/me/credentials/${encodeURIComponent(
      credentialId,
    )}/document`,
  );
}


/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* -------------------------------------------------------------------------- */

export async function createBooking(
  payload: CreateBookingPayload,
): Promise<ApiBooking> {
  return request<ApiBooking>(
    "/bookings",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function getMyBookings(): Promise<ApiBooking[]> {
  return request<ApiBooking[]>(
    "/bookings/me",
  );
}


export async function getProfessionalBookings(): Promise<ApiBooking[]> {
  return request<ApiBooking[]>(
    "/bookings/professional",
  );
}


export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<ApiBooking> {
  return request<ApiBooking>(
    `/bookings/${encodeURIComponent(
      bookingId,
    )}/status?status=${encodeURIComponent(status)}`,
    {
      method: "PATCH",
    },
  );
}


/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export async function getUser(
  userId: string,
): Promise<ApiUser> {
  return request<ApiUser>(
    `/users/${encodeURIComponent(userId)}`,
  );
}


export async function updateUser(
  userId: string,
  payload: {
    display_name?: string;
    avatar_url?: string | null;
  },
): Promise<ApiUser> {
  return request<ApiUser>(
    `/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


/* -------------------------------------------------------------------------- */
/* System                                                                     */
/* -------------------------------------------------------------------------- */

export async function getHealth(): Promise<{
  status: string;
  service: string;
}> {
  return request<{
    status: string;
    service: string;
  }>("/health");
}


/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export function getApiErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}