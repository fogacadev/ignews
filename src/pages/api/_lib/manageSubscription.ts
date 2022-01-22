import { query as q } from 'faunadb';

import { fauna } from "../../../services/fauna";
import { Ref } from 'faunadb';
import { stripe } from '../../../services/stripe';
import { FaUndoAlt } from 'react-icons/fa';

type User = {
    ref: typeof Ref,
    data:{
        stripe_customer_id: string;
    }
}


export async function saveSubscription(
    subscriptionId: string,
    customerId: string,
    createAction = false,
){
     //Buscar o usuario no banco do fauna com ID {customerId}

    console.log('entrou na função')
    console.log(customerId);

    const userRef = await fauna.query(
        q.Select(
        ["ref", "id"],
            q.Get(
                q.Match(
                    q.Index('user_by_stripe_customer_id'), 
                    customerId
                )
            )
        )
    )

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const subscriptionData = {
        id: subscriptionId,
        userId: userRef,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id
    }

    //Salvar os dados da subscription no faundadb
    if(createAction){
        await fauna.query(
            q.Create(
                q.Collection('subscriptions'),
                { data: subscriptionData }
            )
        )
    } else {
        try{
           await fauna.query(
               q.Replace(
                   q.Select(
                       "ref",
                       q.Get(
                           q.Match(
                               q.Index('subscription_by_id'),
                               subscriptionId
                           )
                       )
                   ),
                   { data: subscriptionData }
                ),
           )
        }catch (err){
            console.log('Erro ao dar replace',err.message)
        }
        
    }
}