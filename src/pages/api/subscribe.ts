import { NextApiRequest, NextApiResponse } from "next";

import {query as q, Ref } from 'faunadb';

import { getSession } from "next-auth/react";
import { fauna } from "../../services/fauna";
import { stripe } from "../../services/stripe";


type User = {
    ref: typeof Ref,
    data:{
        stripe_customer_id: string;
    }
}

const subscribe = async (req: NextApiRequest, resp: NextApiResponse) =>{
    if(req.method === 'POST'){
        
        const session  = await getSession({ req });

        const user = await fauna.query<User>(
            q.Get(
                q.Match(q.Index('user_by_email'), q.Casefold(session.user.email))
            )
        )

        
        let customerId = user.data.stripe_customer_id;

        if(!customerId){
            const stripeCustomer = await stripe.customers.create({
                email: session.user.email,
                //metadata
            })

            await fauna.query(
                q.Update(
                    user.ref,{
                        data: { 
                            stripe_customer_id: stripeCustomer.id
                        }
                    }
                )
            );

            customerId = stripeCustomer.id;
        }


        const stripeCheckoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            line_items:[
                { price: 'price_1KJnXLIZDSBGns6RSrN3ZVrp', quantity: 1}
            ],
            mode: 'subscription',
            allow_promotion_codes:true,
            success_url: process.env.STRIPE_SUCCESS_URL,
            cancel_url: process.env.STRIPE_CANCEL_URL

        });

        return resp.status(200).json({sessionId: stripeCheckoutSession.id});

    } else {
        resp.setHeader('Allow', 'POST');
        resp.status(405).end('Method not allowed');
    }
}

export default subscribe;