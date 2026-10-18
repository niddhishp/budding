import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAccess,type SubscriptionRow } from '../../src/lib/billing';
import { billingEventArgs,billingEventSchema } from '../../src/lib/billing-events';
const row:SubscriptionRow={status:'active',interval:'monthly',current_period_end:'2030-01-01',paid_through:'2026-11-01',cancel_at_period_end:false,razorpay_subscription_id:'sub_synthetic'};
test('paid access expires even when provider status stays active; mandate is not payment',()=>{
 assert.equal(hasAccess(row,new Date('2026-10-18')),true);
 assert.equal(hasAccess(row,new Date('2026-11-01')),false);
 assert.equal(hasAccess({...row,status:'authenticated'},new Date('2026-10-18')),false);
 assert.equal(hasAccess({...row,paid_through:null},new Date('2026-10-18')),false);
 assert.equal(hasAccess({...row,status:'cancelled'},new Date('2026-10-18')),true);
 assert.equal(hasAccess({...row,status:'paused'},new Date('2026-10-18')),true);
});
test('only captured subscription charge events can extend access',()=>{
 const event=billingEventSchema.parse({event:'subscription.charged',created_at:12345,payload:{subscription:{entity:{id:'sub_synthetic',status:'active',current_end:123456}},payment:{entity:{status:'captured'}}}});
 assert.equal(billingEventArgs('receipt',event).p_paid,true);
 assert.equal(billingEventArgs('receipt',{...event,event:'subscription.authenticated'}).p_paid,false);
 assert.equal(billingEventArgs('receipt',{...event,payload:{subscription:event.payload.subscription,payment:{entity:{status:'authorized'}}}}).p_paid,false);
});
