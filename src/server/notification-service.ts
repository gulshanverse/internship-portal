import { NotificationType } from '@prisma/client';
import { prisma } from './db';
export async function listNotifications(userId:string){return prisma.notification.findMany({where:{userId},orderBy:{createdAt:'desc'},take:50});}
export async function markNotificationRead(userId:string,id:string){return prisma.notification.updateMany({where:{id,userId},data:{read:true}});}
export async function markAllNotificationsRead(userId:string){return prisma.notification.updateMany({where:{userId,read:false},data:{read:true}});}
export async function createNotification(input:{userId:string;type:NotificationType;title:string;message:string;link?:string}){return prisma.notification.create({data:input});}
