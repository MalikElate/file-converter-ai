import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function UserAvatar() {
  return (
    <Avatar>      
      <AvatarImage src="/bed_pfp.jpg" alt="Bed Profile Picture" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}