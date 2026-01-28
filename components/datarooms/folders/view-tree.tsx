import { useRouter } from "next/router";

import { memo, useMemo } from "react";

import { DataroomFolder } from "@prisma/client";
import { HomeIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { determineTextColor } from "@/lib/utils/determine-text-color";
import {
  HIERARCHICAL_DISPLAY_STYLE,
  getHierarchicalDisplayName,
} from "@/lib/utils/hierarchical-display";

import { FileTree } from "@/components/ui/nextra-filetree";

import { buildNestedFolderStructureWithDocs } from "./utils";

const ViewerDocumentFileItem = memo(
  ({
    document,
    dataroomIndexEnabled,
    textColor,
    linkId,
    viewId,
  }: {
    document: DataroomDocumentWithVersion;
    dataroomIndexEnabled?: boolean;
    textColor?: string;
    linkId?: string;
    viewId?: string;
  }) => {
    const router = useRouter();
    const documentDisplayName = getHierarchicalDisplayName(
      document.name,
      document.hierarchicalIndex,
      dataroomIndexEnabled || false,
    );

    const hasCustomColor = !!textColor;

    const handleClick = () => {
      if (linkId) {
        const query = router.query;
        const params = new URLSearchParams();
        
        // Preserve viewId if available
        if (viewId) {
          params.set('viewId', viewId);
        }
        
        // Preserve previewToken for admin preview mode
        if (query.previewToken) {
          params.set('previewToken', query.previewToken as string);
        }
        
        const queryString = params.toString();
        router.push(`/view/${linkId}/d/${document.dataroomDocumentId}${queryString ? `?${queryString}` : ''}`);
      }
    };

    return (
      <FileTree.File
        name={documentDisplayName}
        onToggle={handleClick}
        className={hasCustomColor ? "hover:!bg-white/10" : undefined}
        style={hasCustomColor ? { color: textColor } : undefined}
      />
    );
  },
);
ViewerDocumentFileItem.displayName = "ViewerDocumentFileItem";

type DataroomDocumentWithVersion = {
  dataroomDocumentId: string;
  folderId: string | null;
  id: string;
  name: string;
  hierarchicalIndex: string | null;
  versions: {
    id: string;
    versionNumber: number;
    hasPages: boolean;
  }[];
};

type DataroomFolderWithDocuments = DataroomFolder & {
  childFolders: DataroomFolderWithDocuments[];
  documents: {
    dataroomDocumentId: string;
    folderId: string | null;
    id: string;
    name: string;
    hierarchicalIndex: string | null;
  }[];
};

type FolderPath = Set<string> | null;

function findFolderPath(
  folder: DataroomFolderWithDocuments,
  folderId: string,
  currentPath: Set<string> = new Set<string>(),
): FolderPath {
  if (folder.id === folderId) {
    return currentPath.add(folder.id);
  }

  for (const child of folder.childFolders) {
    const path = findFolderPath(child, folderId, currentPath.add(folder.id));
    if (path) {
      return path;
    }
  }

  return null;
}

const FolderComponent = memo(
  ({
    folder,
    folderId,
    setFolderId,
    folderPath,
    dataroomIndexEnabled,
    textColor,
    linkId,
    viewId,
  }: {
    folder: DataroomFolderWithDocuments;
    folderId: string | null;
    setFolderId: React.Dispatch<React.SetStateAction<string | null>>;
    folderPath: Set<string> | null;
    dataroomIndexEnabled?: boolean;
    textColor?: string;
    linkId?: string;
    viewId?: string;
  }) => {
    const router = useRouter();

    // Get hierarchical display name for the folder
    const folderDisplayName = getHierarchicalDisplayName(
      folder.name,
      folder.hierarchicalIndex,
      dataroomIndexEnabled || false,
    );

    // Memoize the rendering of the current folder's documents
    const documents = useMemo(
      () =>
        folder.documents.map((doc) => (
          <ViewerDocumentFileItem
            key={doc.id}
            document={{
              ...doc,
              versions: [], // Not needed for display
            }}
            dataroomIndexEnabled={dataroomIndexEnabled}
            textColor={textColor}
            linkId={linkId}
            viewId={viewId}
          />
        )),
      [folder.documents, dataroomIndexEnabled, textColor, linkId, viewId],
    );

    // Recursively render child folders if they exist
    const childFolders = useMemo(
      () =>
        folder.childFolders.map((childFolder) => (
          <FolderComponent
            key={childFolder.id}
            folder={childFolder}
            folderId={folderId}
            setFolderId={setFolderId}
            folderPath={folderPath}
            dataroomIndexEnabled={dataroomIndexEnabled}
            textColor={textColor}
            linkId={linkId}
            viewId={viewId}
          />
        )),
      [
        folder.childFolders,
        folderId,
        setFolderId,
        folderPath,
        dataroomIndexEnabled,
        textColor,
        linkId,
        viewId,
      ],
    );

    const isActive = folder.id === folderId;
    const isChildActive =
      folderPath?.has(folder.id) ||
      folder.childFolders.some((childFolder) => childFolder.id === folderId);

    const hasCustomColor = !!textColor;

    return (
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setFolderId(folder.id);
        }}
      >
        <FileTree.Folder
          name={folderDisplayName}
          key={folder.id}
          active={isActive}
          childActive={isChildActive}
          onToggle={() => setFolderId(folder.id)}
          className={hasCustomColor ? cn(
            "hover:!bg-white/10",
            isActive && "!bg-white/20"
          ) : undefined}
        >
          {childFolders}
          {documents}
        </FileTree.Folder>
      </div>
    );
  },
);
FolderComponent.displayName = "FolderComponent";

const HomeLink = memo(
  ({
    folderId,
    setFolderId,
    textColor,
  }: {
    folderId: string | null;
    setFolderId: React.Dispatch<React.SetStateAction<string | null>>;
    textColor?: string;
  }) => {
    const hasCustomColor = !!textColor;
    return (
      <li
        className={cn(
          "flex list-none",
          "rounded-md transition-all duration-200 ease-in-out",
          !hasCustomColor && "text-foreground",
          hasCustomColor ? "hover:bg-white/10" : "hover:bg-gray-100 hover:shadow-sm hover:dark:bg-muted",
          "px-3 py-1.5 leading-6",
          folderId === null && (hasCustomColor ? "bg-white/20 font-semibold" : "bg-gray-100 font-semibold dark:bg-muted"),
        )}
        style={hasCustomColor ? { color: textColor } : undefined}
      >
        <span
          className="inline-flex w-full cursor-pointer items-center"
          onClick={(e) => {
            e.preventDefault();
            setFolderId(null);
          }}
        >
          <HomeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="ml-2 w-fit truncate" title="Home">
            Dataroom Home
          </span>
        </span>
      </li>
    );
  },
);
HomeLink.displayName = "HomeLink";

const SidebarFolders = ({
  folders,
  documents,
  folderId,
  setFolderId,
  dataroomIndexEnabled,
  accentColor,
  linkId,
  viewId,
}: {
  folders: DataroomFolder[];
  documents: DataroomDocumentWithVersion[];
  folderId: string | null;
  setFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  dataroomIndexEnabled?: boolean;
  accentColor?: string;
  linkId?: string;
  viewId?: string;
}) => {
  const nestedFolders = useMemo(() => {
    if (folders) {
      return buildNestedFolderStructureWithDocs(folders, documents);
    }
    return [];
  }, [folders, documents]);

  const folderPath = useMemo(() => {
    if (!folderId) {
      return null;
    }

    for (let i = 0; i < nestedFolders.length; i++) {
      const path = findFolderPath(nestedFolders[i], folderId);
      if (path) {
        return path;
      }
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, documents, folderId]);

  const hasCustomAccent = !!accentColor;
  const textColor = hasCustomAccent ? determineTextColor(accentColor) : undefined;

  return (
    <div style={hasCustomAccent ? { color: textColor } : undefined}>
      <FileTree>
        <HomeLink folderId={folderId} setFolderId={setFolderId} textColor={textColor} />
        {nestedFolders.map((folder) => (
          <FolderComponent
            key={folder.id}
            folder={folder}
            folderId={folderId}
            setFolderId={setFolderId}
            folderPath={folderPath}
            dataroomIndexEnabled={dataroomIndexEnabled}
            textColor={textColor}
            linkId={linkId}
            viewId={viewId}
          />
        ))}
      </FileTree>
    </div>
  );
};

export function ViewFolderTree({
  folders,
  documents,
  setFolderId,
  folderId,
  dataroomIndexEnabled,
  accentColor,
  linkId,
  viewId,
}: {
  folders: DataroomFolder[];
  documents: DataroomDocumentWithVersion[];
  setFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  folderId: string | null;
  dataroomIndexEnabled?: boolean;
  accentColor?: string;
  linkId?: string;
  viewId?: string;
}) {
  if (!folders) return null;

  return (
    <SidebarFolders
      folders={folders}
      documents={documents}
      setFolderId={setFolderId}
      folderId={folderId}
      dataroomIndexEnabled={dataroomIndexEnabled}
      accentColor={accentColor}
      linkId={linkId}
      viewId={viewId}
    />
  );
}
