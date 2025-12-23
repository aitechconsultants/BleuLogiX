import { useEffect, useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ProjectsListProps {
  onProjectSelect: (projectId: string) => void;
  refreshTrigger?: number;
}

export default function ProjectsList({
  onProjectSelect,
  refreshTrigger = 0,
}: ProjectsListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/projects");

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch projects: ${response.status}`,
          );
        }

        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch projects",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [refreshTrigger]);

  const handleDelete = async (
    projectId: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Your Projects
            </h3>
            <p className="text-xs text-muted-foreground">
              {projects.length} saved project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="space-y-1 p-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(project.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="flex-shrink-0 ml-2 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
