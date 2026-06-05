/**
 * MCE Connect - Study Materials Backend (Google Apps Script)
 * 
 * Safe, Cost-Effective & Permanent Google Drive routing system.
 * This script is called by the MCE Connect React Native App.
 * 
 * Setup Instructions:
 * 1. Open Google Drive, create a folder for study materials, and copy its ID.
 * 2. Replace the ROOT_FOLDER_ID below.
 * 3. Click Deploy > New Deployment. Select "Web App".
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 4. Deploy, authorize permissions, and copy the Web App URL.
 * 5. Paste the Web App URL in your App's Admin panel to instantly make it live!
 */

const ROOT_FOLDER_ID = "1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ";
const ADMIN_SECRET_KEY = "MCE_CONNECT_ADMIN_2026";

function getRootFolder() {
  try {
    if (ROOT_FOLDER_ID && ROOT_FOLDER_ID !== "1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ" && ROOT_FOLDER_ID.trim() !== "") {
      return DriveApp.getFolderById(ROOT_FOLDER_ID);
    }
  } catch (e) {
    Logger.log("Configured ROOT_FOLDER_ID is invalid or inaccessible: " + e.toString());
  }
  return DriveApp.getRootFolder();
}

function doGet(e) {
  return jsonResponse({ success: true, message: "MCE Study Materials Drive Backend is active." });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === "upload_pending") {
      return handleUploadPending(data);
    } else if (action === "route_approved") {
      if (data.secret !== ADMIN_SECRET_KEY) {
        return jsonResponse({ success: false, error: "Unauthorized" });
      }
      return handleRouteApproved(data);
    } else if (action === "delete") {
      if (data.secret !== ADMIN_SECRET_KEY) {
        return jsonResponse({ success: false, error: "Unauthorized" });
      }
      return handleDelete(data.fileId);
    }
    
    return jsonResponse({ success: false, error: "Invalid POST action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// Uploads a base64 file to the "Pending Submissions" folder
function handleUploadPending(data) {
  if (data.isLink) {
    return jsonResponse({ success: true, isLink: true, fileUrl: data.fileUrl });
  }

  const rootFolder = getRootFolder();
  const pendingFolder = getOrCreateFolder(rootFolder, "Pending Submissions");
  
  const decoded = Utilities.base64Decode(data.fileData);
  const fileName = data.fileName || "Untitled.pdf";
  const blob = Utilities.newBlob(decoded, "application/pdf", fileName);
  
  const file = pendingFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return jsonResponse({ 
    success: true, 
    fileId: file.getId(),
    webViewUrl: file.getUrl()
  });
}

// Moves an existing Drive file to the correct structured folder: Branch -> Semester -> Type
function handleRouteApproved(data) {
  if (data.isLink) {
    return jsonResponse({ success: true, isLink: true, webViewUrl: data.fileUrl });
  }

  const fileId = data.fileId;
  const branch = data.branch;
  const semester = data.semester;
  const type = data.materialType;

  if (!fileId || !branch || !semester || !type) {
    return jsonResponse({ success: false, error: "Missing routing parameters" });
  }

  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (e) {
    return jsonResponse({ success: false, error: "File not found in Drive" });
  }

  const rootFolder = getRootFolder();
  
  // 1. Branch Folder
  const branchFolder = getOrCreateFolder(rootFolder, branch);
  
  // 2. Semester Folder
  const semesterFolder = getOrCreateFolder(branchFolder, semester);
  
  // 3. Type Folder
  const typeFolder = getOrCreateFolder(semesterFolder, type);

  // Move file
  file.moveTo(typeFolder);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return jsonResponse({ 
    success: true, 
    fileId: file.getId(),
    webViewUrl: file.getUrl() 
  });
}

function handleDelete(fileId) {
  if (!fileId) return jsonResponse({ success: false, error: "No file ID provided" });
  
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return jsonResponse({ success: true });
  } catch (e) {
    // Might already be deleted
    return jsonResponse({ success: true, message: "File already deleted or not found" });
  }
}

// Helper: Gets a folder by name inside a parent, or creates it if missing
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
