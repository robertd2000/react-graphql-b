import logo from './logo.svg'
import './App.css'
import axios from 'axios'
import { useEffect, useState } from 'react'

const TITLE = 'React GraphQL GitHub Client'

const GET_ISSUES_OF_REPOSITORY = `
  query ($organization: String!, $repository: String!, $cursor: String) {
    organization(login: $organization) {
      id
      name
      url
      repository(name: $repository) {
        id
        name
        url
        stargazers {
          totalCount
        }          
        viewerHasStarred
        issues(first: 5, after: $cursor, states: [OPEN]) {
          edges {
            node {
              id
              title
              url
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`

const ADD_STAR = `
  mutation ($repositoryId: ID!) {
    addStar(input:{starrableId:$repositoryId}) {
      starrable {
        viewerHasStarred
      }
    }
  }
`

const axiosGitHubGraphQL = axios.create({
  baseURL: `https://api.github.com/graphql`,
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`,
  },
})

const getIssuesOfRepository = (path, cursor) => {
  const [organization, repository] = path.split('/')

  return axiosGitHubGraphQL.post('', {
    query: GET_ISSUES_OF_REPOSITORY,
    variables: { organization, repository, cursor },
  })
}

const addStarToRepository = (repositoryId) => {
  return axiosGitHubGraphQL.post('', {
    query: ADD_STAR,
    variables: { repositoryId },
  })
}

function App() {
  const [path, setPath] = useState(
    'the-road-to-learn-react/the-road-to-learn-react'
  )

  const [organization, setOrganization] = useState(null)
  const [errors, setErrors] = useState(null)

  useEffect(() => {
    onFetchFromGitHub(path)
  }, [])
  const onChange = (e) => {
    setPath(e.target.value)
  }
  const onSubmit = (e) => {
    e.preventDefault()

    onFetchFromGitHub(path)
  }

  const onFetchFromGitHub = async (path, cursor) => {
    const response = await getIssuesOfRepository(path, cursor)

    try {
      const newIssues = response.data.data.organization.repository.issues.edges
      const oldIssues = !organization
        ? []
        : organization.repository.issues.edges
      // console.log('newIssues', newIssues)
      // console.log('oldIssues', oldIssues)

      let org = {
        ...response.data.data.organization,
        repository: {
          ...response.data.data.organization.repository,
          issues: {
            ...response.data.data.organization.repository.issues,
            edges: [...oldIssues, ...newIssues],
          },
        },
      }

      console.log(org)
      setOrganization(org)
      setErrors(response.data.errors)
    } catch (error) {
      console.log(error)
    }
  }

  const onFetchMoreIssues = () => {
    const { endCursor } = organization.repository.issues.pageInfo
    onFetchFromGitHub(path, endCursor)
  }

  const onStarRepository = async (repositoryId, viewerHasStarred) => {
    const response = await addStarToRepository(repositoryId, viewerHasStarred)
    console.log(response)
    try {
      const viewerHasStarred = response.data.data.addStar.starrable
      const { totalCount } = !organization
        ? 0
        : organization.repository.stargazers
      console.log(totalCount)
      let res = {
        ...response.data.data.organization,
        repository: {
          ...organization.repository,
          viewerHasStarred,
          stargazers: {
            totalCount: totalCount + 1,
          },
        },
      }

      setOrganization(res)
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="App">
      <h1>{TITLE}</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="url">Show open issues for https://github.com/</label>
        <input
          id="url"
          type="text"
          onChange={onChange}
          value={path}
          style={{ width: '300px' }}
        />
        <button type="submit">Search</button>
      </form>
      {organization ? (
        <Organization
          organization={organization}
          errors={errors}
          onFetchMoreIssues={onFetchMoreIssues}
          onStarRepository={onStarRepository}
        />
      ) : (
        <p>No information yet ...</p>
      )}
    </div>
  )
}

const Organization = ({
  organization,
  errors,
  onFetchMoreIssues,
  onStarRepository,
}) => {
  if (errors) {
    return (
      <div>
        <p>
          <strong>Something went wrong:</strong>
          {errors.map((error) => error.message).join(' ')}
        </p>
      </div>
    )
  }
  return (
    <div>
      <p>
        <strong>Issues from Organization:</strong>
        <a href={organization.url}>{organization.name}</a>
      </p>
      <Repository
        repository={organization.repository}
        onFetchMoreIssues={onFetchMoreIssues}
        onStarRepository={onStarRepository}
      />
    </div>
  )
}

const Repository = ({ repository, onFetchMoreIssues, onStarRepository }) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <button
      onClick={() =>
        onStarRepository(repository.id, repository.viewerHasStarred)
      }
    >
      {repository.stargazers.totalCount}
      {repository.viewerHasStarred ? 'Unstar' : 'Star'}
    </button>
    <ul>
      {repository.issues.edges.map((issue) => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>

          <ul>
            {issue.node.reactions.edges.map((reaction) => (
              <li key={reaction.node.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
    <hr />
    {repository.issues.pageInfo.hasNextPage && (
      <button onClick={onFetchMoreIssues}>More</button>
    )}
  </div>
)

export default App

// import React, { Component } from 'react'
// import axios from 'axios'

// const TITLE = 'React GraphQL GitHub Client'

// const axiosGitHubGraphQL = axios.create({
//   baseURL: 'https://api.github.com/graphql',
//   headers: {
//     Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`,
//   },
// })

// const GET_ISSUES_OF_REPOSITORY = `
//   query ($organization: String!, $repository: String!, $cursor: String) {
//     organization(login: $organization) {
//       name
//       url
//       repository(name: $repository) {
//         name
//         url
//         issues(first: 5, after: $cursor, states: [OPEN]) {
//           edges {
//             node {
//               id
//               title
//               url
//               reactions(last: 3) {
//                 edges {
//                   node {
//                     id
//                     content
//                   }
//                 }
//               }
//             }
//           }
//           totalCount
//           pageInfo {
//             endCursor
//             hasNextPage
//           }
//         }
//       }
//     }
//   }
// `

// const getIssuesOfRepository = (path, cursor) => {
//   const [organization, repository] = path.split('/')

//   return axiosGitHubGraphQL.post('', {
//     query: GET_ISSUES_OF_REPOSITORY,
//     variables: { organization, repository, cursor },
//   })
// }

// const resolveIssuesQuery = (queryResult, cursor) => (state) => {
//   const { data, errors } = queryResult.data

//   if (!cursor) {
//     return {
//       organization: data.organization,
//       errors,
//     }
//   }

//   const { edges: oldIssues } = state.organization.repository.issues
//   const { edges: newIssues } = data.organization.repository.issues
//   const updatedIssues = [...oldIssues, ...newIssues]

//   return {
//     organization: {
//       ...data.organization,
//       repository: {
//         ...data.organization.repository,
//         issues: {
//           ...data.organization.repository.issues,
//           edges: updatedIssues,
//         },
//       },
//     },
//     errors,
//   }
// }

// class App extends Component {
//   state = {
//     path: 'the-road-to-learn-react/the-road-to-learn-react',
//     organization: null,
//     errors: null,
//   }

//   componentDidMount() {
//     this.onFetchFromGitHub(this.state.path)
//   }

//   onChange = (event) => {
//     this.setState({ path: event.target.value })
//   }

//   onSubmit = (event) => {
//     this.onFetchFromGitHub(this.state.path)

//     event.preventDefault()
//   }

//   onFetchFromGitHub = (path, cursor) => {
//     getIssuesOfRepository(path, cursor).then((queryResult) => {
//       let a = resolveIssuesQuery(queryResult, cursor)
//       console.log(a)
//       this.setState(resolveIssuesQuery(queryResult, cursor))
//     })
//   }

//   onFetchMoreIssues = () => {
//     const { endCursor } = this.state.organization.repository.issues.pageInfo

//     this.onFetchFromGitHub(this.state.path, endCursor)
//   }

//   render() {
//     const { path, organization, errors } = this.state

//     return (
//       <div>
//         <h1>{TITLE}</h1>

//         <form onSubmit={this.onSubmit}>
//           <label htmlFor="url">Show open issues for https://github.com/</label>
//           <input
//             id="url"
//             type="text"
//             value={path}
//             onChange={this.onChange}
//             style={{ width: '300px' }}
//           />
//           <button type="submit">Search</button>
//         </form>

//         <hr />

//         {organization ? (
//           <Organization
//             organization={organization}
//             errors={errors}
//             onFetchMoreIssues={this.onFetchMoreIssues}
//           />
//         ) : (
//           <p>No information yet ...</p>
//         )}
//       </div>
//     )
//   }
// }

// const Organization = ({ organization, errors, onFetchMoreIssues }) => {
//   if (errors) {
//     return (
//       <p>
//         <strong>Something went wrong:</strong>
//         {errors.map((error) => error.message).join(' ')}
//       </p>
//     )
//   }

//   return (
//     <div>
//       <p>
//         <strong>Issues from Organization:</strong>
//         <a href={organization.url}>{organization.name}</a>
//       </p>
//       <Repository
//         repository={organization.repository}
//         onFetchMoreIssues={onFetchMoreIssues}
//       />
//     </div>
//   )
// }

// const Repository = ({ repository, onFetchMoreIssues }) => (
//   <div>
//     <p>
//       <strong>In Repository:</strong>
//       <a href={repository.url}>{repository.name}</a>
//     </p>

//     <ul>
//       {repository.issues.edges.map((issue) => (
//         <li key={issue.node.id}>
//           <a href={issue.node.url}>{issue.node.title}</a>

//           <ul>
//             {issue.node.reactions.edges.map((reaction) => (
//               <li key={reaction.node.id}>{reaction.node.content}</li>
//             ))}
//           </ul>
//         </li>
//       ))}
//     </ul>

//     <hr />

//     {repository.issues.pageInfo.hasNextPage && (
//       <button onClick={onFetchMoreIssues}>More</button>
//     )}
//   </div>
// )

// export default App
