import React, { useEffect, useState } from 'react';
import { Configuration, KafkaRequest, SecurityApi } from '@rhoas/kafka-management-sdk';
import { Principal, PrincipalsContext, PrincipalType, useAuth, useConfig } from '@rhoas/app-services-ui-shared';
import { PrincipalApi } from '@redhat-cloud-services/rbac-client';

export type PrincipalsProviderProps = {
  kafkaInstance?: KafkaRequest;
};

export const usePrincipal = () => {
  const config = useConfig();
  const auth = useAuth();

  const [serviceAccountPrincipals, setServiceAccountPrincipals] = useState<Principal[] | undefined>();
  const [userAcountPrincipals, setUserAccountPrincipals] = useState<Principal[] | undefined>();

  useEffect(() => {
    const fetchUserAccounts = async () => {
      if (config !== undefined && auth !== undefined && config.rbac.basePath !== undefined) {
        const accessToken = await auth.kas.getToken();
        const principalApi = new PrincipalApi({
          accessToken,
          basePath: config?.rbac.basePath,
        });

        try {
          const userAccounts = await principalApi.listPrincipals(-1).then((response) =>
            response.data.data.map((p) => {
              return {
                id: p.username,
                principalType: PrincipalType.UserAccount,
                displayName: `${p.first_name} ${p.last_name}`,
                emailAddress: p.email,
              } as Principal;
            })
          );
          setUserAccountPrincipals(userAccounts);
        } catch (e) {
          // temp fix - this API is only available to org admins
          // needs a proper approach longer term
        }
      }
    };
    fetchUserAccounts();
  }, [auth, config]);

  useEffect(() => {
    const fetchServiceAccounts = async () => {
      if (config !== undefined && auth !== undefined && config.rbac.basePath !== undefined) {
        const accessToken = await auth.kas.getToken();
        const securityApi = new SecurityApi({
          accessToken,
          basePath: config.kas.apiBasePath,
        } as Configuration);
        const serviceAccounts = await securityApi.getServiceAccounts().then((response) =>
          response.data.items.map((sa) => {
            return {
              id: sa.client_id,
              displayName: sa.name,
              principalType: PrincipalType.ServiceAccount,
            } as Principal;
          })
        );

        setServiceAccountPrincipals(serviceAccounts);
      }
    };
    fetchServiceAccounts();
  }, [auth, config]);

  const value = {
    getAllPrincipals: () => {
      let answer: Principal[] = [];
      if (userAcountPrincipals !== undefined && serviceAccountPrincipals !== undefined) {
        answer = answer.concat(userAcountPrincipals);
      }
      if (serviceAccountPrincipals !== undefined) {
        answer = answer.concat(serviceAccountPrincipals);
      }
      return answer;
    },
    getAllUserAccounts: () => {
      return userAcountPrincipals;
    },
    getAllServiceAccounts: () => {
      return serviceAccountPrincipals;
    },
  };

  return value;
};

export const PrincipalsProvider: React.FunctionComponent<PrincipalsProviderProps> = ({ children }) => {
  const { getAllPrincipals } = usePrincipal();
  return <PrincipalsContext.Provider value={{ getAllPrincipals }}>{children}</PrincipalsContext.Provider>;
};
