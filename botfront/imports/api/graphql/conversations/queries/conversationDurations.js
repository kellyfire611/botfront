import Conversations from '../conversations.model';

const generateBucket = bounds => ({
    case: {
        $cond: [
            { $and: bounds }, 1, 0,
        ],
    },
    then: bounds[0].$gte[1].toString(),
});

const generateBuckets = (cuttoffs, variable) => {
    const buckets = [];
    cuttoffs.forEach((val, idx, array) => {
        const bounds = [{ $gte: [variable, val] }];
        if (idx + 1 !== array.length) {
            bounds.push({ $lt: [variable, array[idx + 1]] });
        }
        buckets.push(generateBucket(bounds));
    });
    buckets.unshift(generateBucket([
        { $gte: [variable, 0] },
        { $lt: [variable, cuttoffs[0]] },
    ]));
    return buckets;
};

export const getConversationDurations = async ({
    projectId,
    from,
    to = new Date().getTime(),
    cuttoffs,
}) => Conversations.aggregate([
    {
        $match: {
            projectId,
        },
    },
    {
        $match: {
            $and: [
                {
                    'tracker.latest_event_time': {
                        $lte: to, // timestamp
                        $gte: from, // timestamp
                    },
                },
            ],
        },
    },
    {
        $unwind: {
            path: '$tracker.events',
        },
    },
    {
        $match: {
            $and: [{ 'tracker.events.event': 'user' }],
        },
    },
    {
        $group: {
            _id: '$tracker.sender_id',
            first: { $first: '$tracker.events' },
            end: { $first: '$tracker.latest_event_time' },
        },
    },
    {
        $project: {
            difference: { $subtract: ['$end', '$first.timestamp'] },
        },
    },
    {
        $project: {
            duration: {
                $switch: {
                    branches: generateBuckets(cuttoffs, '$difference'),
                },
            },
        },
    },
    {
        $group: {
            _id: '$duration',
            count: {
                $sum: 1,
            },
        },
    },
    {
        $group: {
            _id: null,
            total: { $sum: '$count' },
            data: { $push: '$$ROOT' },
        },
    },
    { $unwind: '$data' },
    {
        $project: {
            _id: false,
            duration: '$data._id',
            frequency: { $divide: ['$data.count', '$total'] },
            count: '$data.count',
        },
    },
    { $sort: { frequency: -1 } },
    // { $limit : 100 }
]);
