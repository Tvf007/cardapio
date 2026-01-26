import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    message: 'Pages Router Works!',
    router: 'PAGES ROUTER (not App Router)',
    time: new Date(),
    method: req.method
  });
}
