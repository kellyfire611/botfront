import { getActionCounts } from '../mongo/actionCounts';
import { checkIfCan } from '../../../../lib/scopes';

export default {
    Query: {
        async actionCounts(parent, args, context) {
            if (!args.projectId) throw new Error('ProjectId is required');
            checkIfCan('analytics:r', args.projectId, context.user._id);
            return getActionCounts(args);
        },
    },
    ActionCount: {
        bucket: (parent, args, context, info) => parent.bucket,
        hits: (parent, args, context, info) => parent.hits,
        count: (parent, args, context, info) => parent.count,
        proportion: (parent, args, context, info) => parent.proportion,
    },

};
