import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";
import { Event } from "../lib/models/Event";

export const GetEventsByIdList = async (ids: number[], participantId?: number): Promise<Event[]> => {
    if (!ids || ids.length <= 0) {
        throw new Error("At least one event id is reaquired");
    }

    const query = `
        query {
            events(eventId: "in (${ids.join(",")})", whereMode: specific) {
              eventId,
              title: eventTitle,
              description,
              startDateTime: eventStartDate,
              endDateTime: eventEndDate,
              featuredImageUrl,
              participantsExpected,
              childcareCapacity,
              guestsAllowed: allowAnonymousGuests,
              congregation: to_congregations_using_congregationId {
                  id: congregationId,
                name: congregationName,
              },
              ageRange: to_ageRanges_using_ageRangeId {
                id: ageRangeId,
                name: ageRanges,
              },
              eventTags: from_eventTagEvents_using_eventId {
                tags: to_eventTags_using_eventTagId {
                  id: eventTagId,
                  name: eventTag,
                }
              },
              primaryContact: to_contacts_using_primaryContact {
                firstName,
                lastName,
                emailAddress,
              }
              address: to_addresses_using_addressId {
                addressLine1,
                addressLine2,
                city,
                state: stateRegion,
                postalCode,
              },
              eventParticipants: from_eventParticipants_using_eventId {
                participantId,
                eventParticipantId,
                      participant: to_participants_using_participantId {
                  contact: to_contacts_using_contactId {
                    contactId,
                    firstName,
                    nickname,
                    lastName,
                  }
                }
                status: to_participationStatuses_using_participationStatusId {
                  participationStatus,
                },
                eventLeader,
              }
            }
          }
    `;

    const events: any = (await AwaitHelper.execute(GraphService.getSingleton().runQuery(query))).events;

    const results: Event[] = events.map((event: any) => ({
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        featuredImageUrl: event.featuredImageUrl,
        spotsAvailable:
            event.participantsExpected -
            event.eventParticipants?.filter((ep: any) => ep.status.id !== 5 && ep.status.id !== 7).length,
        participantsExpected: event.participantsExpected,
        childcareAvailable:
            event.childcareCapacity > event.eventParticipants?.filter((ep: any) => ep.status.id === 7).length,
        guestsAllowed: event.guestAllowed,
        congregation: event.congregation,
        ageRange: event.ageRange,
        eventTags: event.eventTags?.map((tag: any) => tag.tags),
        primaryContact: event.primaryContact,
        address: event.address,
        leaders: event.eventParticipant
            ?.filter((ep: any) => ep.eventLeader)
            ?.map((ep: any) => ({
                contactId: ep.participant.contact.contactId,
                participantId: ep.participantId,
                eventParticipantId: ep.eventParticipantId,
                firstName: ep.participant.contact.firstName,
                nickname: ep.participant.contact.nickname,
                lastName: ep.participant.contact.lastName,
            })),
        eventParticipant: event.eventParticipant
            ?.filter((ep: any) => ep.participantId === participantId)
            ?.map((ep: any) => ({
                id: ep.eventParticipantId,
                status: ep.status.name,
            }))[0],
    }));

    return results;
};
