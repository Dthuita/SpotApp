    
//DEALING WITH TENSORS FOR TRAINING
    //destruct xs with map ==> then find min and max for each value
    // const norm_xs = normalization(xs_raw, false).arraySync();
    // xs_ten.print();

    // //turns raw into dataset
    // const XS = tf.data.array(xs_ten).shuffle(seed=12).batch(404), YS = tf.data.array(ys_ten).shuffle(seed=12).batch(404);
    // await XS.forEachAsync(e => e.print() );

    // //turn dataset to tensor2d()
    // const tx = tf.tensor2d(await XS.toArray()), ty = tf.tensor2d(await YS.toArray());

    // const flattendDataset = tf.data.zip({ xs: XS, ys: YS}).batch(18);
    // await flattendDataset.forEachAsync(e => console.log(JSON.stringify(e)));


//SAVE FUNCTION
    // await model.save('file://./transitionModel');//needs tfjs-node


//why does the push return undefined