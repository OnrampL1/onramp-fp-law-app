import { Link, useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Sparkles,
  Link2,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContractRowActionsProps {
  id: string;
}

export function ContractRowActions({ id }: ContractRowActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Contract actions"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<Link to={`/contracts/${id}`} />}>
          <Eye className="size-4" />
          View Contract
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to={`/contracts/${id}/edit`} />}>
          <Pencil className="size-4" />
          Edit Metadata
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to={`/contracts/${id}/analysis`} />}>
          <Sparkles className="size-4" />
          View AI Analysis
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate(`/witness-workflow?contractId=${id}`)}
        >
          <Link2 className="size-4" />
          Generate Witness Link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Archive className="size-4" />
          Archive Contract
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
