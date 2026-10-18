import 'server-only';
import { z } from 'zod';
import { planIdFor } from './billing';
import type { BillingInterval } from './plans';
const planSchema=z.object({id:z.string(),period:z.enum(['monthly','yearly']),interval:z.number(),item:z.object({amount:z.number(),currency:z.string()})});
export function validatePlan(value:unknown, interval:BillingInterval, expectedId:string){
  const plan=planSchema.parse(value);
  if(plan.id!==expectedId || plan.period!==interval || plan.interval!==1 || plan.item.currency!=='INR' || plan.item.amount!==(interval==='monthly'?29900:199900))throw new Error('Provider plan differs from published pricing');
  return {interval,amount:plan.item.amount,currency:plan.item.currency};
}
export async function checkPaymentPlan(interval:BillingInterval){
  const id=planIdFor(interval);
  const key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
  if(!key||!secret)throw new Error('Provider credentials missing');
  const response=await fetch(`https://api.razorpay.com/v1/plans/${encodeURIComponent(id)}`,{headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`},signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!response.ok)throw new Error('Provider plan unavailable');
  return validatePlan(await response.json(),interval,id);
}
