/** Shared demo/API service contract. Wire paths and permission rules: docs/backend-integration.md. */
export type MaybePromise<T> = T | Promise<T>;
export type RoleId = "regular_teacher" | "print_farm_member" | "senior_print_farm_member" | "print_farm_teacher";
export type JobStatus = "SUBMITTED" | "APPROVED" | "IN_PROGRESS" | "AWAITING_AUTHORIZATION" | "AUTHORIZED" | "PRINTING" | "COMPLETED" | "COLLECTED" | "CANCELLED" | "REJECTED";
export type ErrorCode = "validation" | "permission_denied" | "signed_out" | "expired_session" | "network_error" | "conflict" | "storage_error" | "invalid_response" | "not_found" | "rate_limited" | "server_error";
export interface ServiceFailure extends Error { code: ErrorCode; status?: number; fields?: Record<string,string>; requestId?: string }
export interface Identity { id:string; name:string; email:string; roleId:RoleId; authenticationMode?:"demo"|"server" }
export interface SessionState { status:"loading"|"signed-out"|"signed-in"|"expired-session"|"error"; user:Identity|null; permissions:string[]; error:{code:ErrorCode;message:string}|null }
export interface SessionService {
  mode:"demo"|"api"; getState():SessionState; load():Promise<SessionState>; subscribe(listener:(state:SessionState)=>void):()=>void;
  getCurrentIdentity():Identity|null; getCurrentRole():{id:RoleId;title:string;level:number}|null; getActiveRoleId():RoleId|null; can(permission:string):boolean;
  /** Demo-only compatibility controls: API returns []/false or throws permission_denied. */
  getDemoIdentities():Identity[]; switchRole(id:string):boolean; createDemoAccount(payload:{name:string;roleId:RoleId}):Identity;
}
export interface Versioned { id:string; version:number }
export interface Attachment { id:string; name:string; sizeBytes:number; type?:string; lastModified?:number; status?:"stored" }
export interface FilamentSnapshot { id:string; material:"PLA"|"PETG"|"TPU"; color:string; hexColor:string }
export interface Inventory extends FilamentSnapshot, Versioned { available:boolean;lowStock:boolean;rgbColor?:string;createdAt?:string;updatedAt?:string }
export interface HistoryEvent { type:string;at:string|null;by:string;byId?:string;note?:string;visibility?:string }
export interface Approval { decision:"approved"|"rejected";byId:string;by:string;at:string;reason:string }
export interface Authorization { id:string; decision:"pending"|"authorized"|"revision";requestedById:string;requestedBy:string;requestedAt:string;byId?:string;by?:string;at?:string;reason?:string }
export interface Job extends Versioned {
  projectName:string;submitterId?:string;submitterName:string;submitterEmail:string;recipientEmail:string;
  modelUrl?:string;fileName:string;fileSize:string;attachments?:Attachment[];inventoryId?:string;
  material:string;color:string;hexColor?:string;filamentSnapshot?:FilamentSnapshot;purpose?:string;notes?:string;layerHeight?:string;infill?:number|null;
  submittedAt:string;status:JobStatus;initialApproval:Approval|{legacy:true}|null;printAuthorization?:Authorization|null;
  assignedStaffId?:string|null;assignedStaff:string|null;pickupLocation?:string|null;pickupInstructions?:string;completedAt?:string|null;collectedAt?:string;history:HistoryEvent[];
}
export interface RequestFields { projectName:string;inventoryId:string;material:"PLA"|"PETG"|"TPU";color:string;purpose?:"Personal project"|"Class project"|"Functional prototype"|"Engineering design"|"Other";notes?:string;layerHeight?:"0.12"|"0.16"|"0.20"|"0.24"|"0.28";infill?:number;submissionKey:string }
export type NewRequest = RequestFields & ({modelUrl:string;modelFiles?:never;attachments?:never;file?:never}|{modelUrl?:"";modelFiles:File[];attachments?:Attachment[];file?:{name:string;sizeBytes:number}}|{modelUrl?:"";modelFiles?:never;attachments:Attachment[];file?:never});
export interface Page<T> { items:T[];total:number;page:number;pageSize:number }
export interface JobFilters { search?:string;status?:JobStatus|"ALL";material?:string;sort?:"newest"|"oldest"|"project";page?:number;pageSize?:number }
export interface DraftFields { linkUrl?:string;projectName?:string;purpose?:string;notes?:string;inventoryId?:string;material?:string;color?:string }
export interface Pickup {pickupLocation:string;pickupInstructions?:string;notifyRecipient?:boolean}
export interface JobsService {
  mode:"demo"|"api";listJobs(filters?:JobFilters):Promise<Job[]>;listPage(filters?:JobFilters):Promise<Page<Job>>;getJob(id:string):Promise<Job|null>;getMyJob(id:string):Promise<Job|null>;listMyJobs():Promise<Job[]>;listMyActiveJobs():Promise<Job[]>;
  createJob(payload:NewRequest):Promise<Job>;claimJob(id:string):Promise<Job>;reassignJob(id:string,assigneeId:string):Promise<Job>;
  reviewRequest(id:string,decision:"approved"|"rejected",reason?:string):Promise<Job>;requestAuthorization(id:string):Promise<Job>;
  reviewAuthorization(id:string,decision:"authorized"|"revision",reason?:string,expectedRequestedAt?:string|null,expectedAuthorizationId?:string|null):Promise<Job>;
  startPrinting(id:string):Promise<Job>;completeJob(id:string,payload:Pickup):Promise<{job:Job;notification:DeliveryNotification|null}>;updatePickup(id:string,payload:Pickup):Promise<Job>;collectJob(id:string):Promise<Job>;
  listJobEvents(id:string):Promise<HistoryEvent[]>;summary():Promise<{unclaimed:number;pendingReview:number;inProgress:number;printing:number;completedToday:number;total:number}>;
  getDraft():MaybePromise<DraftFields|null>;saveDraft(fields:DraftFields):MaybePromise<boolean>;discardDraft():MaybePromise<void|null>;availableStatuses():JobStatus[];
}
export interface InventoryService {listInventory():Promise<Inventory[]>;listAvailable():Promise<Inventory[]>;getItem(id:string):Promise<Inventory|null>;add(payload:{material:string;color:string;hexColor:string}):Promise<Inventory>;update(id:string,payload:{color:string;hexColor:string}):Promise<Inventory>;toggleAvailability(id:string):Promise<Inventory>;toggleLowStock(id:string):Promise<Inventory>;remove(id:string):Promise<Inventory|null>}
export interface FilesService {
  mode:"demo"|"api";inspectSelection(file:File):{valid:boolean;error?:string;metadata?:{name:string;sizeBytes:number;extension:string}};inspectUrl(url:string):{valid:boolean;error?:string;url?:string};validateMetadata(attachment:Attachment):boolean;
  upload(files:File[],options:{idempotencyKey:string}):Promise<Attachment[]>;verify(attachments:Attachment[]):Promise<Attachment[]>;getAttachment(id:string):Promise<Attachment|null>;get(id:string):Promise<File|null>;
}
export interface DeliveryNotification extends Versioned {jobId:string;recipientEmail:string;subject:string;status:"PENDING"|"SENT"|"FAILED";createdAt:string;simulated?:boolean}
export interface NotificationsService {mode:"demo"|"api";listForJob(jobId:string):Promise<DeliveryNotification[]>;get(id:string):Promise<DeliveryNotification|null>;retry(id:string):Promise<DeliveryNotification>}
export interface InboxEntry {id:string;userId:string;eventKey:string;createdAt:string;kind:string;context:string;title:string;summary:string;message?:string;jobId?:string;requestId?:string;requesterId?:string;authorizationId?:string}
export interface InboxService {list():Promise<InboxEntry[]>;open(id:string):Promise<InboxEntry>}
export interface Presence {id:string;name:string;present:boolean;updatedAt:string|null}
export interface PresenceService {list():Promise<Presence[]>;set(present:boolean):Promise<{present:boolean;updatedAt:string}>}
export interface Contribution extends Versioned {student:string;date:string;hours:number;activity:string;staffId?:string;createdAt:string;updatedAt:string;createdBy:string;createdById?:string;submissionKey?:string}
export interface HourTransaction {id:string;userId:string;deltaCenti:number;balanceBeforeCenti:number;balanceAfterCenti:number;reason:string;source:"manual"|"request"|"contribution";submissionKey?:string;contributionId?:string;workDate?:string;actorId:string;actorName:string;requestId:string|null;createdAt:string}
export interface HourRequest extends Versioned {submissionKey:string;requesterId:string;requesterName:string;requesterLevel:number;adjustmentType:"add"|"subtract";hoursCenti:number;reason:string;status:"Pending"|"Approved"|"Rejected";submittedAt:string;reviewedById:string|null;reviewedByName:string|null;decidedAt:string|null;rejectionReason:string;transactionId:string|null}
export interface StaffBalance extends Versioned {name:string;roleId:RoleId;roleTitle:string;level:number;balanceCenti:number;latestTransaction?:HourTransaction|null;pendingRequests?:Pick<HourRequest,"id"|"adjustmentType"|"hoursCenti">[]}
export interface StaffDetail extends StaffBalance {transactions:HourTransaction[];requests:HourRequest[]}
export interface HoursService {
  newSubmissionKey():string;getOwnDashboard():Promise<{identity:Identity;balanceCenti:number;transactions:HourTransaction[];requests:HourRequest[];pendingCount:number}>;
  getStaffOverview(search?:string):Promise<StaffBalance[]>;getStaffDetail(id:string):Promise<StaffDetail>;getAdminActivity(id:string):Promise<unknown[]>;listRequests(status?:string):Promise<HourRequest[]>;
  submitRequest(payload:{adjustmentType:"add"|"subtract";hours:string;reason:string;submissionKey:string}):Promise<HourRequest>;
  giveHours(id:string,payload:{date:string;hours:string;activity:string;submissionKey:string;expectedBalanceCenti:number|string}):Promise<{contribution:Contribution;transaction:HourTransaction}>;
  adjustStaffHours(id:string,payload:{adjustmentType:"subtract";hours:string;reason:string;submissionKey:string;expectedBalanceCenti:number|string}):Promise<HourTransaction>;
  approveRequest(id:string):Promise<{request:HourRequest;transaction:HourTransaction}>;rejectRequest(id:string,reason?:string):Promise<HourRequest>;
}
export interface ContributionsService {list(filters?:{student?:string;from?:string;to?:string}):Promise<Contribution[]>;listAll():Promise<Contribution[]>;add(payload:{student:string;date:string;hours:number|string;activity:string}):Promise<Contribution>;update(id:string,payload:{student:string;date:string;hours:number|string;activity:string}):Promise<Contribution>}
export interface RefreshService {subscribe(listener:()=>MaybePromise<void>):()=>void;refresh():Promise<void>;reload?():Promise<void>}
export declare const jobsService:JobsService;
export declare const inventoryService:InventoryService;
export declare const hoursService:HoursService;
export declare const contributionsService:ContributionsService;
export declare const inboxService:InboxService;
export declare const presenceService:PresenceService;
export declare const directoryService:{listStaff():Promise<Identity[]>};
export declare const diagnosticsService:{getStatus():{issues:string[];writesBlocked:boolean};exportData?():string};
export declare const refreshService:RefreshService;
export declare function resetLocalData():Promise<void>;
export declare function rgbFromHex(value:string):string;
